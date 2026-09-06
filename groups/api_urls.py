from django.urls import path

from . import api_views

urlpatterns = [
    path('', api_views.GroupListCreateView.as_view(), name='api_group_list'),
    path('join/', api_views.JoinGroupView.as_view(), name='api_join_group'),
    path('<str:code>/', api_views.GroupDetailView.as_view(), name='api_group_detail'),
]