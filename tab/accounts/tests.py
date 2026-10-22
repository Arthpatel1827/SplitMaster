from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient, APITestCase

from groups.models import ActivityLog, Expense, ExpenseSplit, Group, Membership


class AuthTests(APITestCase):
    def setUp(self):
        cache.clear()

    def register(self, **kw):
        payload = {'username': 'sam', 'password': 'Tr1cky-passw0rd!', **kw}
        return self.client.post('/api/auth/register/', payload, format='json')

    def login(self, username='sam', password='Tr1cky-passw0rd!'):
        return self.client.post('/api/auth/token/', {'username': username, 'password': password}, format='json')

    def test_register_login_me(self):
        self.assertEqual(self.register(email='sam@example.com').status_code, 201)
        res = self.login()
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.data['username'], 'sam')
        self.assertEqual(me.data['email'], 'sam@example.com')

    def test_register_never_returns_password(self):
        self.assertNotIn('password', self.register().data)

    def test_weak_and_similar_passwords_rejected(self):
        self.assertEqual(self.register(password='123').status_code, 400)
        self.assertEqual(self.register(username='samantha', password='samantha1').status_code, 400)

    def test_duplicate_username_case_insensitive(self):
        self.register()
        self.assertEqual(self.register(username='SAM').status_code, 400)

    def test_bad_login(self):
        self.register()
        self.assertEqual(self.login(password='wrong').status_code, 401)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_refresh_rotates_and_logout_blacklists(self):
        self.register()
        tokens = self.login().data
        refreshed = self.client.post('/api/auth/token/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn('refresh', refreshed.data)
        # rotated token cannot be reused
        self.assertEqual(
            self.client.post('/api/auth/token/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)
        # logout invalidates the current refresh token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
        self.assertEqual(self.client.post('/api/auth/logout/', {'refresh': refreshed.data['refresh']}, format='json').status_code, 204)
        self.assertEqual(
            self.client.post('/api/auth/token/refresh/', {'refresh': refreshed.data['refresh']}, format='json').status_code, 401)


class AccountTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('sam', 'sam@example.com', 'Tr1cky-passw0rd!')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_update_profile(self):
        res = self.client.patch('/api/auth/me/', {'username': 'samuel', 'email': 'new@example.com'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual((self.user.username, self.user.email), ('samuel', 'new@example.com'))

    def test_profile_username_must_be_unique(self):
        User.objects.create_user('taken', password='Tr1cky-passw0rd!')
        self.assertEqual(self.client.patch('/api/auth/me/', {'username': 'Taken'}, format='json').status_code, 400)

    def test_change_password(self):
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'Tr1cky-passw0rd!', 'new_password': 'An0ther-Good-One!'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('An0ther-Good-One!'))

    def test_change_password_needs_correct_current_and_strong_new(self):
        bad = self.client.post('/api/auth/change-password/', {
            'current_password': 'nope', 'new_password': 'An0ther-Good-One!'}, format='json')
        self.assertEqual(bad.status_code, 400)
        weak = self.client.post('/api/auth/change-password/', {
            'current_password': 'Tr1cky-passw0rd!', 'new_password': '1234'}, format='json')
        self.assertEqual(weak.status_code, 400)

    def test_password_reset_flow(self):
        anon = APIClient()
        res = anon.post('/api/auth/password-reset/', {'email': 'SAM@example.com'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        uid = body.split('uid=')[1].split('&')[0]
        token = body.split('token=')[1].split()[0]
        ok = anon.post('/api/auth/password-reset/confirm/',
                       {'uid': uid, 'token': token, 'new_password': 'Brand-New-Pw-77'}, format='json')
        self.assertEqual(ok.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Brand-New-Pw-77'))
        # token is single-use
        again = anon.post('/api/auth/password-reset/confirm/',
                          {'uid': uid, 'token': token, 'new_password': 'Yet-Another-Pw-88'}, format='json')
        self.assertEqual(again.status_code, 400)

    def test_password_reset_does_not_reveal_unknown_email(self):
        res = APIClient().post('/api/auth/password-reset/', {'email': 'nobody@example.com'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_rejects_bad_token_and_weak_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        anon = APIClient()
        self.assertEqual(anon.post('/api/auth/password-reset/confirm/',
                                   {'uid': uid, 'token': 'bad', 'new_password': 'Brand-New-Pw-77'}, format='json').status_code, 400)
        token = default_token_generator.make_token(self.user)
        self.assertEqual(anon.post('/api/auth/password-reset/confirm/',
                                   {'uid': uid, 'token': token, 'new_password': '123'}, format='json').status_code, 400)

    def test_delete_account_requires_password(self):
        self.assertEqual(self.client.post('/api/auth/delete-account/', {'password': 'wrong'}, format='json').status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_delete_account_blocked_with_balance(self):
        other = User.objects.create_user('pat', password='Tr1cky-passw0rd!')
        g = Group.objects.create(name='G', created_by=self.user)
        Membership.objects.create(user=self.user, group=g)
        Membership.objects.create(user=other, group=g)
        e = Expense.objects.create(group=g, description='x', amount=10, paid_by=other)
        ExpenseSplit.objects.create(expense=e, user=self.user, share=10)
        res = self.client.post('/api/auth/delete-account/', {'password': 'Tr1cky-passw0rd!'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_delete_account_anonymises_and_preserves_others_history(self):
        other = User.objects.create_user('pat', password='Tr1cky-passw0rd!')
        g = Group.objects.create(name='G', created_by=self.user)
        Membership.objects.create(user=self.user, group=g)
        Membership.objects.create(user=other, group=g)
        e = Expense.objects.create(group=g, description='x', amount=10, paid_by=self.user)
        ExpenseSplit.objects.create(expense=e, user=self.user, share=10)  # settled: paid & owes the same
        res = self.client.post('/api/auth/delete-account/', {'password': 'Tr1cky-passw0rd!'}, format='json')
        self.assertEqual(res.status_code, 204)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertFalse(self.user.has_usable_password())
        self.assertEqual(self.user.email, '')
        self.assertTrue(Expense.objects.filter(pk=e.pk).exists())  # history preserved
        g.refresh_from_db()
        self.assertEqual(g.created_by, other)
        self.assertFalse(Membership.objects.filter(user=self.user).exists())
        self.assertEqual(APIClient().post('/api/auth/token/', {'username': 'sam', 'password': 'Tr1cky-passw0rd!'}, format='json').status_code, 401)
