from decimal import Decimal

from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import Expense, ExpenseSplit, Group


class GroupListSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    my_balance = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'code', 'created_at', 'member_count', 'my_balance']

    def get_member_count(self, group):
        return group.members.count()

    def get_my_balance(self, group):
        from .balances import compute_balances
        user = self.context['request'].user
        return str(compute_balances(group).get(user.id, Decimal('0.00')))


class GroupDetailSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'code', 'created_by', 'created_at', 'simplify_debts', 'members']


class CreateGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'code']
        read_only_fields = ['code']


class JoinGroupSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=8)

    def validate_code(self, value):
        return value.strip().upper()
    
class ExpenseSplitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ExpenseSplit
        fields = ['user', 'share']


class ExpenseListSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    split_count = serializers.IntegerField(source='splits.count', read_only=True)
    has_receipt = serializers.SerializerMethodField()
    has_notes = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = ['id', 'kind', 'description', 'amount', 'paid_by', 'split_count',
                  'has_receipt', 'has_notes', 'is_refunded', 'created_at']

    def get_has_receipt(self, obj):
        return obj.receipts.exists()

    def get_has_notes(self, obj):
        return bool(obj.notes)


class ExpenseDetailSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    splits = ExpenseSplitSerializer(many=True, read_only=True)
    receipts = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = ['id', 'kind', 'split_type', 'description', 'amount', 'paid_by',
                  'splits', 'notes', 'receipts', 'is_refunded', 'created_at']

    def get_receipts(self, obj):
        request = self.context.get('request')
        return [
            {'id': r.id, 'url': request.build_absolute_uri(r.image.url) if request else r.image.url}
            for r in obj.receipts.all()
        ]

class RenameGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['name']