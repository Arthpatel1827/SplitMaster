from decimal import Decimal, InvalidOperation

from .models import Expense, ExpenseSplit


def parse_custom_shares(split_among, amount, split_type, raw_shares):
    """raw_shares: dict keyed by user id (str or int) -> raw string/number value.
    Returns (shares_dict, error_message). shares_dict maps user -> Decimal dollar amount.
    """
    raw_values = {}
    for user in split_among:
        raw = raw_shares.get(str(user.id), raw_shares.get(user.id, ''))
        raw = str(raw).strip() if raw not in (None, '') else ''
        try:
            raw_values[user] = Decimal(raw) if raw else Decimal('0')
        except InvalidOperation:
            return None, f"Enter a valid number for {user.username}."

    if split_type == Expense.SPLIT_EXACT:
        total = sum(raw_values.values())
        if abs(total - amount) > Decimal('0.01'):
            return None, f'Amounts must add up to ${amount} (currently ${total}).'
        return raw_values, None

    if split_type == Expense.SPLIT_PERCENT:
        total_pct = sum(raw_values.values())
        if abs(total_pct - Decimal('100')) > Decimal('0.5'):
            return None, f'Percentages must add up to 100% (currently {total_pct}%).'
        dollar_values = {}
        running_total = Decimal('0.00')
        users_list = list(raw_values.items())
        for i, (user, pct) in enumerate(users_list):
            if i == len(users_list) - 1:
                dollar_values[user] = (amount - running_total).quantize(Decimal('0.01'))
            else:
                amt = (amount * pct / Decimal('100')).quantize(Decimal('0.01'))
                dollar_values[user] = amt
                running_total += amt
        return dollar_values, None

    # shares
    total_shares = sum(raw_values.values())
    if total_shares <= 0:
        return None, 'Enter at least one share for someone.'
    dollar_values = {}
    running_total = Decimal('0.00')
    users_list = [item for item in raw_values.items() if item[1] > 0]
    for i, (user, shares) in enumerate(users_list):
        if i == len(users_list) - 1:
            dollar_values[user] = (amount - running_total).quantize(Decimal('0.01'))
        else:
            amt = (amount * shares / total_shares).quantize(Decimal('0.01'))
            dollar_values[user] = amt
            running_total += amt
    if not dollar_values:
        return None, 'Enter at least one share for someone.'
    return dollar_values, None


def save_splits(expense, split_among, amount, split_type=Expense.SPLIT_EQUAL, custom_shares=None):
    expense.splits.all().delete()
    if split_type == Expense.SPLIT_EQUAL or not custom_shares:
        share = (amount / len(split_among)).quantize(Decimal('0.01'))
        remainder = amount - (share * len(split_among))
        for i, user in enumerate(split_among):
            ExpenseSplit.objects.create(
                expense=expense, user=user,
                share=share + (remainder if i == 0 else Decimal('0.00')),
            )
    else:
        for user, amt in custom_shares.items():
            ExpenseSplit.objects.create(expense=expense, user=user, share=amt)