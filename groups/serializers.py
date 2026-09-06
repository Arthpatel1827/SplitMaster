from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import Group


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