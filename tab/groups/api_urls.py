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
    path('<str:code>/settings/', api_views.GroupSettingsView.as_view(), name='api_group_settings'),
    path('<str:code>/leave/', api_views.LeaveGroupView.as_view(), name='api_leave_group'),
    path('<str:code>/delete/', api_views.DeleteGroupView.as_view(), name='api_delete_group'),
]