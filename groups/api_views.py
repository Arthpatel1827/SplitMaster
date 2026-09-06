from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .balances import compute_balances, compute_pairwise_balances, simplify_debts, log_activity
from .models import Group, Membership
from .serializers import (
    CreateGroupSerializer,
    GroupDetailSerializer,
    GroupListSerializer,
    JoinGroupSerializer,
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