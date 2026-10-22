from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from groups.api_helpers import BALANCE_TOLERANCE
from groups.balances import compute_balances, log_activity
from groups.models import Group, Membership

from .serializers import (
    ChangePasswordSerializer,
    DeleteAccountSerializer,
    MeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    RegisterSerializer,
)


class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class LogoutView(APIView):
    """Blacklist the refresh token so it can't be used again."""

    def post(self, request):
        try:
            RefreshToken(request.data.get('refresh', '')).blacklist()
        except TokenError:
            pass  # already invalid/expired: the client is logged out either way
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated.'})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        for user in User.objects.filter(email__iexact=email, is_active=True):
            if not user.has_usable_password():
                continue
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}'
            send_mail(
                'Reset your SplitMaster password',
                f'Hi {user.username},\n\nUse this link to choose a new password:\n{link}\n\n'
                'If you did not ask for this, you can ignore this email.',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        # Same answer whether or not the email exists, so accounts can't be enumerated.
        return Response({'detail': 'If that email is registered, a reset link is on its way.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        invalid = Response({'detail': 'This reset link is invalid or has expired.'}, status=400)

        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(data['uid'])), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return invalid
        if not default_token_generator.check_token(user, data['token']):
            return invalid
        try:
            validate_password(data['new_password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)})

        user.set_password(data['new_password'])
        user.save()
        return Response({'detail': 'Password updated. You can log in now.'})


class DeleteAccountView(APIView):
    """
    Closes the account. The user row is anonymised rather than hard-deleted, because
    deleting it would cascade-delete every expense they paid and corrupt other
    people's balances.
    """

    def post(self, request):
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['password']):
            return Response({'detail': 'Password is incorrect.'}, status=400)

        memberships = Membership.objects.filter(user=user).select_related('group')
        for m in memberships:
            if abs(compute_balances(m.group).get(user.id, Decimal('0.00'))) > BALANCE_TOLERANCE:
                return Response(
                    {'detail': f'Settle up in "{m.group.name}" before deleting your account.'},
                    status=400,
                )

        with transaction.atomic():
            for m in list(memberships):
                group = m.group
                m.delete()
                remaining = Membership.objects.filter(group=group).order_by('joined_at').select_related('user')
                if not remaining.exists():
                    group.delete()
                    continue
                if group.created_by_id == user.id:
                    group.created_by = remaining.first().user
                    group.save(update_fields=['created_by'])
                log_activity(group, None, f'{user.username} left the group')
            # also covers groups they created but are no longer a member of
            Group.objects.filter(created_by=user).update(created_by=None)

            user.username = f'deleted_user_{user.pk}'
            user.email = ''
            user.first_name = user.last_name = ''
            user.is_active = False
            user.set_unusable_password()
            user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
