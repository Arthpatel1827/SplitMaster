from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import Expense, ExpenseSplit, Group


class GroupListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'code', 'created_at']


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
        return bool(obj.receipt)

    def get_has_notes(self, obj):
        return bool(obj.notes)


class ExpenseDetailSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    splits = ExpenseSplitSerializer(many=True, read_only=True)
    receipt = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = ['id', 'kind', 'split_type', 'description', 'amount', 'paid_by',
                  'splits', 'notes', 'receipt', 'is_refunded', 'created_at']

    def get_receipt(self, obj):
        if not obj.receipt:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.receipt.url) if request else obj.receipt.url