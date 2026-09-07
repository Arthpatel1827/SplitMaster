import random

from django.conf import settings
from django.db import models


def generate_code():
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choice(chars) for _ in range(6))
        if not Group.objects.filter(code=code).exists():
            return code


class Group(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=8, unique=True, default=generate_code)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_groups'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through='Membership', related_name='tab_groups')
    simplify_debts = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Membership(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'group')


class Expense(models.Model):
    EXPENSE = 'expense'
    PAYMENT = 'payment'
    REFUND = 'refund'
    KIND_CHOICES = [(EXPENSE, 'Expense'), (PAYMENT, 'Payment'), (REFUND, 'Refund')]

    SPLIT_EQUAL = 'equal'
    SPLIT_EXACT = 'exact'
    SPLIT_PERCENT = 'percent'
    SPLIT_SHARES = 'shares'
    SPLIT_TYPE_CHOICES = [
        (SPLIT_EQUAL, 'Equal'),
        (SPLIT_EXACT, 'Exact amounts'),
        (SPLIT_PERCENT, 'Percentages'),
        (SPLIT_SHARES, 'Shares'),
    ]

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='expenses')
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default=EXPENSE)
    split_type = models.CharField(max_length=10, choices=SPLIT_TYPE_CHOICES, default=SPLIT_EQUAL)
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expenses_paid'
    )
    notes = models.TextField(blank=True)
    receipt = models.ImageField(upload_to='receipts/%Y/%m/', blank=True, null=True)
    is_refunded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.description} - {self.amount}"


class ExpenseSplit(models.Model):
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='splits')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expense_splits')
    share = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('expense', 'user')


class ActivityLog(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='activity_log')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message