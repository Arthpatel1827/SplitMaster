from django.urls import path

from . import api_views

urlpatterns = [
    path('', api_views.GroupListCreateView.as_view(), name='api_group_list'),
    path('join/', api_views.JoinGroupView.as_view(), name='api_join_group'),
    path('<str:code>/', api_views.GroupDetailView.as_view(), name='api_group_detail'),
    path('<str:code>/expenses/', api_views.ExpenseListCreateView.as_view(), name='api_expense_list'),
    path('<str:code>/expenses/<int:pk>/', api_views.ExpenseDetailView.as_view(), name='api_expense_detail'),
    path('<str:code>/expenses/<int:pk>/refund/', api_views.RefundExpenseView.as_view(), name='api_refund_expense'),
    path('<str:code>/record-payment/', api_views.RecordPaymentView.as_view(), name='api_record_payment'),
    path('<str:code>/balances/', api_views.BalancesView.as_view(), name='api_balances'),
    path('<str:code>/activity/', api_views.ActivityLogView.as_view(), name='api_activity'),
]