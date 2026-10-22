from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import api_views

urlpatterns = [
    path('register/', api_views.RegisterView.as_view(), name='api_register'),
    path('token/', api_views.ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', api_views.LogoutView.as_view(), name='api_logout'),
    path('me/', api_views.MeView.as_view(), name='api_me'),
    path('change-password/', api_views.ChangePasswordView.as_view(), name='api_change_password'),
    path('password-reset/', api_views.PasswordResetRequestView.as_view(), name='api_password_reset'),
    path('password-reset/confirm/', api_views.PasswordResetConfirmView.as_view(), name='api_password_reset_confirm'),
    path('delete-account/', api_views.DeleteAccountView.as_view(), name='api_delete_account'),
]
