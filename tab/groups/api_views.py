import json
from decimal import Decimal, InvalidOperation
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from .api_helpers import get_member_group
from .balances import compute_balances, compute_pairwise_balances, simplify_debts, log_activity
from .expense_logic import parse_custom_shares, save_splits
from .models import Group, Membership,  ActivityLog, Expense, ExpenseSplit
from .serializers import (
    CreateGroupSerializer,
    GroupDetailSerializer,
    GroupListSerializer,
    JoinGroupSerializer,
    ExpenseDetailSerializer, 
    ExpenseListSerializer, 
    UserSerializer,
    RenameGroupSerializer,
)


class GroupListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.tab_groups.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateGroupSerializer
        return GroupListSerializer

    def perform_create(self, serializer):
        group = serializer.save(created_by=self.request.user)
        Membership.objects.create(user=self.request.user, group=group)
        log_activity(group, self.request.user, f'{self.request.user.username} created the group')


class JoinGroupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = JoinGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code']

        try:
            group = Group.objects.get(code=code)
        except Group.DoesNotExist:
            return Response({'detail': 'No group found with that code.'}, status=status.HTTP_404_NOT_FOUND)

        _, created = Membership.objects.get_or_create(user=request.user, group=group)
        if created:
            log_activity(group, request.user, f'{request.user.username} joined the group')

        return Response(GroupDetailSerializer(group).data, status=status.HTTP_200_OK)


class GroupDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GroupDetailSerializer
    lookup_field = 'code'
    lookup_url_kwarg = 'code'

    def get_queryset(self):
        # only groups the current user is actually a member of
        return Group.objects.filter(members=self.request.user)
    
def _parse_json_field(raw, default):
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            return default
    return raw if raw is not None else default


class ExpenseListCreateView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request, code):
        group = get_member_group(request.user, code)
        expenses = group.expenses.select_related('paid_by').prefetch_related('splits__user')
        return Response(ExpenseListSerializer(expenses, many=True, context={'request': request}).data)

    def post(self, request, code):
        group = get_member_group(request.user, code)
        data = request.data

        description = str(data.get('description', '')).strip()
        if not description:
            return Response({'detail': 'Description is required.'}, status=400)

        try:
            amount = Decimal(str(data.get('amount')))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'Enter a valid amount.'}, status=400)
        if amount <= 0:
            return Response({'detail': 'Amount must be greater than zero.'}, status=400)

        members_by_id = {u.id: u for u in group.members.all()}
        try:
            paid_by = members_by_id[int(data.get('paid_by'))]
        except (KeyError, TypeError, ValueError):
            return Response({'detail': 'Invalid paid_by.'}, status=400)

        split_among_ids = _parse_json_field(data.get('split_among'), [])
        try:
            split_among = [members_by_id[int(uid)] for uid in split_among_ids]
        except (KeyError, TypeError, ValueError):
            return Response({'detail': 'Invalid split_among.'}, status=400)
        if not split_among:
            return Response({'detail': 'Select at least one person to split with.'}, status=400)

        split_type = data.get('split_type', Expense.SPLIT_EQUAL)
        custom_shares = None
        if split_type != Expense.SPLIT_EQUAL:
            shares_raw = _parse_json_field(data.get('shares'), {})
            custom_shares, error = parse_custom_shares(split_among, amount, split_type, shares_raw)
            if error:
                return Response({'detail': error}, status=400)

        expense = Expense.objects.create(
            group=group, description=description, amount=amount, paid_by=paid_by,
            split_type=split_type, notes=data.get('notes', ''),
            receipt=request.FILES.get('receipt'),
        )
        save_splits(expense, split_among, amount, split_type, custom_shares)
        log_activity(group, request.user, f'{request.user.username} added "{description}" (${amount})')
        return Response(ExpenseDetailSerializer(expense, context={'request': request}).data, status=201)


class ExpenseDetailView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request, code, pk):
        group = get_member_group(request.user, code)
        expense = get_object_or_404_expense(group, pk)
        return Response(ExpenseDetailSerializer(expense, context={'request': request}).data)

    def put(self, request, code, pk):
        group = get_member_group(request.user, code)
        expense = get_object_or_404_expense(group, pk)
        data = request.data

        old_description, old_amount, old_paid_by = expense.description, expense.amount, expense.paid_by
        old_split_usernames = set(expense.splits.select_related('user').values_list('user__username', flat=True))

        description = str(data.get('description', '')).strip()
        if not description:
            return Response({'detail': 'Description is required.'}, status=400)
        try:
            amount = Decimal(str(data.get('amount')))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'Enter a valid amount.'}, status=400)

        members_by_id = {u.id: u for u in group.members.all()}
        try:
            paid_by = members_by_id[int(data.get('paid_by'))]
        except (KeyError, TypeError, ValueError):
            return Response({'detail': 'Invalid paid_by.'}, status=400)

        split_among_ids = _parse_json_field(data.get('split_among'), [])
        try:
            split_among = [members_by_id[int(uid)] for uid in split_among_ids]
        except (KeyError, TypeError, ValueError):
            return Response({'detail': 'Invalid split_among.'}, status=400)
        if not split_among:
            return Response({'detail': 'Select at least one person to split with.'}, status=400)

        split_type = data.get('split_type', Expense.SPLIT_EQUAL)
        custom_shares = None
        if split_type != Expense.SPLIT_EQUAL:
            shares_raw = _parse_json_field(data.get('shares'), {})
            custom_shares, error = parse_custom_shares(split_among, amount, split_type, shares_raw)
            if error:
                return Response({'detail': error}, status=400)

        expense.description = description
        expense.amount = amount
        expense.paid_by = paid_by
        expense.split_type = split_type
        expense.notes = data.get('notes', expense.notes)
        if request.FILES.get('receipt'):
            expense.receipt = request.FILES['receipt']
        expense.save()
        save_splits(expense, split_among, amount, split_type, custom_shares)

        changes = []
        if old_description != description:
            changes.append(f'description "{old_description}" \u2192 "{description}"')
        if old_amount != amount:
            changes.append(f'amount ${old_amount} \u2192 ${amount}')
        if old_paid_by.id != paid_by.id:
            changes.append(f'paid by {old_paid_by.username} \u2192 {paid_by.username}')
        new_split_usernames = {u.username for u in split_among}
        if old_split_usernames != new_split_usernames:
            added = new_split_usernames - old_split_usernames
            removed = old_split_usernames - new_split_usernames
            bits = []
            if added:
                bits.append(f'added {", ".join(sorted(added))}')
            if removed:
                bits.append(f'removed {", ".join(sorted(removed))}')
            changes.append(f'split: {"; ".join(bits)}')
        summary = '; '.join(changes) if changes else 'no changes'
        log_activity(group, request.user, f'{request.user.username} edited "{description}": {summary}')

        return Response(ExpenseDetailSerializer(expense, context={'request': request}).data)

    def delete(self, request, code, pk):
        group = get_member_group(request.user, code)
        expense = get_object_or_404_expense(group, pk)
        description = expense.description
        expense.delete()
        log_activity(group, request.user, f'{request.user.username} deleted "{description}"')
        return Response(status=204)


class RefundExpenseView(APIView):
    def post(self, request, code, pk):
        group = get_member_group(request.user, code)
        original = get_object_or_404_expense(group, pk, kind=Expense.EXPENSE)

        if original.is_refunded:
            return Response({'detail': 'This expense has already been refunded.'}, status=400)

        refund = Expense.objects.create(
            group=group, kind=Expense.REFUND, description=f'Refund: {original.description}',
            amount=-original.amount, paid_by=original.paid_by, split_type=original.split_type,
        )
        for s in original.splits.all():
            ExpenseSplit.objects.create(expense=refund, user=s.user, share=-s.share)

        original.is_refunded = True
        original.save()
        log_activity(group, request.user, f'{request.user.username} refunded "{original.description}" (${original.amount})')
        return Response(ExpenseDetailSerializer(original, context={'request': request}).data)


class RecordPaymentView(APIView):
    def post(self, request, code):
        group = get_member_group(request.user, code)
        try:
            from_user = User.objects.get(id=request.data.get('from_user'))
            to_user = User.objects.get(id=request.data.get('to_user'))
            amount = Decimal(str(request.data.get('amount')))
        except (User.DoesNotExist, InvalidOperation, TypeError, ValueError):
            return Response({'detail': 'Invalid payment data.'}, status=400)

        expense = Expense.objects.create(
            group=group, kind=Expense.PAYMENT, description=f'{from_user.username} paid {to_user.username}',
            amount=amount, paid_by=from_user,
        )
        ExpenseSplit.objects.create(expense=expense, user=to_user, share=amount)
        log_activity(group, request.user, f'{from_user.username} paid {to_user.username} (${amount})')
        return Response(ExpenseDetailSerializer(expense, context={'request': request}).data, status=201)


class BalancesView(APIView):
    def get(self, request, code):
        group = get_member_group(request.user, code)
        members = list(group.members.all())
        users_by_id = {u.id: u for u in members}
        balances = compute_balances(group)

        if group.simplify_debts:
            settle_txns = simplify_debts(balances, users_by_id)
        else:
            settle_txns = compute_pairwise_balances(group, users_by_id)

        return Response({
            'my_balance': str(balances.get(request.user.id, Decimal('0.00'))),
            'balances': [
                {'user': UserSerializer(users_by_id[uid]).data, 'amount': str(amt)}
                for uid, amt in balances.items()
            ],
            'settle_txns': [
                {'from_user': UserSerializer(t['from_user']).data,
                 'to_user': UserSerializer(t['to_user']).data,
                 'amount': str(t['amount'])}
                for t in settle_txns
            ],
        })


class ActivityLogView(APIView):
    def get(self, request, code):
        group = get_member_group(request.user, code)
        entries = group.activity_log.select_related('user')[:50]
        return Response([
            {'message': e.message, 'created_at': e.created_at, 'user': e.user.username if e.user else None}
            for e in entries
        ])


def get_object_or_404_expense(group, pk, **filters):
    from django.shortcuts import get_object_or_404
    return get_object_or_404(
        Expense.objects.select_related('paid_by').prefetch_related('splits__user'),
        id=pk, group=group, **filters
    )
    
class GroupSettingsView(APIView):
    def get(self, request, code):
        group = get_member_group(request.user, code)
        return Response({
            'name': group.name,
            'code': group.code,
            'simplify_debts': group.simplify_debts,
            'is_creator': group.created_by_id == request.user.id,
        })

    def patch(self, request, code):
        group = get_member_group(request.user, code)

        if 'simplify_debts' in request.data:
            group.simplify_debts = bool(request.data['simplify_debts'])
            group.save()
            log_activity(
                group, request.user,
                f'{request.user.username} turned {"on" if group.simplify_debts else "off"} simplified settle-up'
            )

        if 'name' in request.data:
            old_name = group.name
            serializer = RenameGroupSerializer(group, data={'name': request.data['name']}, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            if old_name != group.name:
                log_activity(group, request.user, f'{request.user.username} renamed the group to "{group.name}"')

        return Response({
            'name': group.name,
            'code': group.code,
            'simplify_debts': group.simplify_debts,
            'is_creator': group.created_by_id == request.user.id,
        })


class LeaveGroupView(APIView):
    def post(self, request, code):
        group = get_member_group(request.user, code)
        balances = compute_balances(group)
        my_balance = balances.get(request.user.id, Decimal('0.00'))

        if abs(my_balance) > Decimal('0.005'):
            return Response({'detail': "You can't leave until you're settled up in this group."}, status=400)

        from .models import Membership
        Membership.objects.filter(user=request.user, group=group).delete()
        log_activity(group, request.user, f'{request.user.username} left the group')
        return Response(status=204)


class DeleteGroupView(APIView):
    def delete(self, request, code):
        group = get_member_group(request.user, code)

        if group.created_by_id != request.user.id:
            return Response({'detail': 'Only the group creator can delete this group.'}, status=403)

        balances = compute_balances(group)
        if any(abs(b) > Decimal('0.005') for b in balances.values()):
            return Response({'detail': "You can't delete a group with unsettled balances."}, status=400)

        group.delete()
        return Response(status=204)