from decimal import Decimal
from .models import ActivityLog
from collections import defaultdict


def compute_balances(group):
    """
    Returns {user_id: Decimal net_balance}.
    Positive = is owed money. Negative = owes money.
    
    """
    balances = {m.id: Decimal('0.00') for m in group.members.all()}

    for expense in group.expenses.prefetch_related('splits').select_related('paid_by'):
        balances[expense.paid_by_id] = balances.get(expense.paid_by_id, Decimal('0.00')) + expense.amount
        for split in expense.splits.all():
            balances[split.user_id] = balances.get(split.user_id, Decimal('0.00')) - split.share

    return balances


def simplify_debts(balances, users_by_id):
    """
    Greedy minimum-cash-flow simplification.
    Returns a list of dicts: {'from_user': User, 'to_user': User, 'amount': Decimal}
    
    """
    creditors = []
    debtors = []
    for uid, amount in balances.items():
        rounded = amount.quantize(Decimal('0.01'))
        if rounded > Decimal('0.005'):
            creditors.append([uid, rounded])
        elif rounded < Decimal('-0.005'):
            debtors.append([uid, -rounded])

    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)

    txns = []
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        pay = min(debtors[i][1], creditors[j][1])
        txns.append({
            'from_user': users_by_id[debtors[i][0]],
            'to_user': users_by_id[creditors[j][0]],
            'amount': pay.quantize(Decimal('0.01')),
        })
        debtors[i][1] -= pay
        creditors[j][1] -= pay
        if debtors[i][1] < Decimal('0.005'):
            i += 1
        if creditors[j][1] < Decimal('0.005'):
            j += 1

    return txns

def compute_pairwise_balances(group, users_by_id):
    """Direct debts between each pair, without collapsing through third parties.
    Returns list of dicts: {'from_user': User, 'to_user': User, 'amount': Decimal}
    """
    directed = defaultdict(Decimal)

    for expense in group.expenses.prefetch_related('splits').select_related('paid_by'):
        if expense.kind == 'payment':
            split = expense.splits.first()
            if split:
                directed[(expense.paid_by_id, split.user_id)] -= expense.amount
        else:
            for split in expense.splits.all():
                if split.user_id != expense.paid_by_id:
                    directed[(split.user_id, expense.paid_by_id)] += split.share

    seen_pairs = set()
    txns = []
    for (debtor_id, creditor_id) in list(directed.keys()):
        pair = frozenset((debtor_id, creditor_id))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)

        a, b = tuple(pair) if len(pair) == 2 else (debtor_id, debtor_id)
        net = directed.get((a, b), Decimal('0.00')) - directed.get((b, a), Decimal('0.00'))
        net = net.quantize(Decimal('0.01'))

        if net > Decimal('0.005'):
            txns.append({'from_user': users_by_id[a], 'to_user': users_by_id[b], 'amount': net})
        elif net < Decimal('-0.005'):
            txns.append({'from_user': users_by_id[b], 'to_user': users_by_id[a], 'amount': -net})

    return txns

def log_activity(group, user, message):
    ActivityLog.objects.create(group=group, user=user, message=message)
    