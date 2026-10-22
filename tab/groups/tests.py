import io
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient, APITestCase

from .balances import compute_balances, simplify_debts, compute_pairwise_balances
from .models import ActivityLog, Expense, Group, Membership


def D(x):
    return Decimal(str(x))


class GroupTestBase(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', password='pw-Alice-123')
        self.bob = User.objects.create_user('bob', password='pw-Bob-12345')
        self.carol = User.objects.create_user('carol', password='pw-Carol-123')
        self.mallory = User.objects.create_user('mallory', password='pw-Mal-12345')
        self.group = Group.objects.create(name='Trip', created_by=self.alice)
        for u in (self.alice, self.bob, self.carol):
            Membership.objects.create(user=u, group=self.group)
        self.code = self.group.code

    def as_user(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def add_expense(self, payer, amount, among=None, split_type='equal', shares=None, user=None, **extra):
        among = among or [self.alice, self.bob, self.carol]
        payload = {
            'description': 'Dinner', 'amount': str(amount), 'paid_by': payer.id,
            'split_among': [u.id for u in among], 'split_type': split_type,
            'shares': shares or {}, **extra,
        }
        return self.as_user(user or payer).post(f'/api/groups/{self.code}/expenses/', payload, format='json')

    def balances(self):
        return compute_balances(self.group)


class SplitMathTests(GroupTestBase):
    def test_equal_split_reconciles_exactly(self):
        res = self.add_expense(self.alice, '100.00')
        self.assertEqual(res.status_code, 201)
        shares = [D(s['share']) for s in res.data['splits']]
        self.assertEqual(sum(shares), D('100.00'))
        self.assertEqual(sorted(shares), [D('33.33'), D('33.33'), D('33.34')])

    def test_equal_split_four_people(self):
        dave = User.objects.create_user('dave', password='pw-Dave-1234')
        Membership.objects.create(user=dave, group=self.group)
        res = self.add_expense(self.alice, '100', among=[self.alice, self.bob, self.carol, dave])
        self.assertEqual([D(s['share']) for s in res.data['splits']], [D('25.00')] * 4)

    def test_exact_split(self):
        res = self.add_expense(self.alice, '100', split_type='exact',
                               shares={self.alice.id: '40', self.bob.id: '30', self.carol.id: '30'})
        self.assertEqual(res.status_code, 201)
        got = {s['user']['username']: D(s['share']) for s in res.data['splits']}
        self.assertEqual(got, {'alice': D('40'), 'bob': D('30'), 'carol': D('30')})

    def test_exact_split_must_add_up(self):
        res = self.add_expense(self.alice, '100', split_type='exact',
                               shares={self.alice.id: '40', self.bob.id: '30', self.carol.id: '20'})
        self.assertEqual(res.status_code, 400)

    def test_percent_split_reconciles(self):
        res = self.add_expense(self.alice, '100.01', split_type='percent',
                               shares={self.alice.id: '50', self.bob.id: '30', self.carol.id: '20'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(sum(D(s['share']) for s in res.data['splits']), D('100.01'))

    def test_percent_must_total_100(self):
        res = self.add_expense(self.alice, '100', split_type='percent',
                               shares={self.alice.id: '50', self.bob.id: '30', self.carol.id: '10'})
        self.assertEqual(res.status_code, 400)

    def test_shares_split_reconciles(self):
        res = self.add_expense(self.alice, '100', split_type='shares',
                               shares={self.alice.id: '2', self.bob.id: '1', self.carol.id: '1'})
        self.assertEqual(res.status_code, 201)
        got = {s['user']['username']: D(s['share']) for s in res.data['splits']}
        self.assertEqual(got, {'alice': D('50.00'), 'bob': D('25.00'), 'carol': D('25.00')})

    def test_shares_with_awkward_total_reconciles(self):
        res = self.add_expense(self.alice, '10.00', split_type='shares',
                               shares={self.alice.id: '1', self.bob.id: '1', self.carol.id: '1'})
        self.assertEqual(sum(D(s['share']) for s in res.data['splits']), D('10.00'))

    def test_rejects_bad_amounts(self):
        for bad in ('0', '-5', 'abc', 'NaN', 'Infinity', '', '1e30'):
            res = self.add_expense(self.alice, bad)
            self.assertEqual(res.status_code, 400, bad)
        self.assertEqual(Expense.objects.count(), 0)

    def test_rejects_unknown_split_type(self):
        res = self.add_expense(self.alice, '10', split_type='weird')
        self.assertEqual(res.status_code, 400)


class BalanceTests(GroupTestBase):
    def test_balances_after_expense(self):
        self.add_expense(self.alice, '90')
        b = self.balances()
        self.assertEqual(b[self.alice.id], D('60.00'))
        self.assertEqual(b[self.bob.id], D('-30.00'))
        self.assertEqual(b[self.carol.id], D('-30.00'))
        self.assertEqual(sum(b.values()), D('0'))

    def test_edit_updates_balances(self):
        res = self.add_expense(self.alice, '90')
        eid = res.data['id']
        edit = self.as_user(self.alice).put(f'/api/groups/{self.code}/expenses/{eid}/', {
            'description': 'Dinner', 'amount': '60', 'paid_by': self.alice.id,
            'split_among': [self.alice.id, self.bob.id, self.carol.id], 'split_type': 'equal',
        }, format='json')
        self.assertEqual(edit.status_code, 200)
        self.assertEqual(self.balances()[self.alice.id], D('40.00'))
        self.assertTrue(ActivityLog.objects.filter(message__contains='amount $90.00').exists())

    def test_edit_rejects_non_positive_amount(self):
        eid = self.add_expense(self.alice, '90').data['id']
        edit = self.as_user(self.alice).put(f'/api/groups/{self.code}/expenses/{eid}/', {
            'description': 'x', 'amount': '-1', 'paid_by': self.alice.id,
            'split_among': [self.alice.id], 'split_type': 'equal',
        }, format='json')
        self.assertEqual(edit.status_code, 400)

    def test_delete_restores_balances(self):
        eid = self.add_expense(self.alice, '90').data['id']
        res = self.as_user(self.bob).delete(f'/api/groups/{self.code}/expenses/{eid}/')
        self.assertEqual(res.status_code, 204)
        self.assertTrue(all(v == 0 for v in self.balances().values()))

    def test_balances_endpoint(self):
        self.add_expense(self.alice, '90')
        res = self.as_user(self.bob).get(f'/api/groups/{self.code}/balances/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(D(res.data['my_balance']), D('-30.00'))


class SimplifyTests(GroupTestBase):
    def test_simplified_preserves_net_balances_and_reduces_payments(self):
        # alice pays for bob; bob pays for carol  => bob is a pass-through
        self.add_expense(self.alice, '20', among=[self.bob])
        self.add_expense(self.bob, '20', among=[self.carol])
        users = {u.id: u for u in (self.alice, self.bob, self.carol)}
        balances = compute_balances(self.group)
        simple = simplify_debts(balances, users)
        pairwise = compute_pairwise_balances(self.group, users)
        self.assertEqual(len(pairwise), 2)
        self.assertEqual(len(simple), 1)
        self.assertEqual((simple[0]['from_user'], simple[0]['to_user'], simple[0]['amount']),
                         (self.carol, self.alice, D('20.00')))
        # applying the simplified payments zeroes every net balance
        net = dict(balances)
        for t in simple:
            net[t['from_user'].id] += t['amount']
            net[t['to_user'].id] -= t['amount']
        self.assertTrue(all(abs(v) < D('0.01') for v in net.values()))

    def test_toggle_controls_endpoint_output(self):
        self.add_expense(self.alice, '20', among=[self.bob])
        self.add_expense(self.bob, '20', among=[self.carol])
        client = self.as_user(self.alice)
        self.assertEqual(len(client.get(f'/api/groups/{self.code}/balances/').data['settle_txns']), 2)
        client.patch(f'/api/groups/{self.code}/settings/', {'simplify_debts': True}, format='json')
        self.assertEqual(len(client.get(f'/api/groups/{self.code}/balances/').data['settle_txns']), 1)


class PaymentTests(GroupTestBase):
    def pay(self, user, from_user, to_user, amount):
        return self.as_user(user).post(f'/api/groups/{self.code}/record-payment/', {
            'from_user': from_user.id, 'to_user': to_user.id, 'amount': str(amount)}, format='json')

    def test_payment_settles_balance(self):
        self.add_expense(self.alice, '60', among=[self.alice, self.bob])
        res = self.pay(self.bob, self.bob, self.alice, '30')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.balances()[self.bob.id], D('0.00'))
        self.assertTrue(ActivityLog.objects.filter(message__contains='bob paid alice').exists())

    def test_cannot_settle_with_user_outside_group(self):
        for args in ((self.bob, self.mallory, self.alice), (self.bob, self.bob, self.mallory)):
            res = self.pay(*args, '10')
            self.assertEqual(res.status_code, 400)
        self.assertFalse(Expense.objects.filter(kind=Expense.PAYMENT).exists())

    def test_non_member_cannot_record_payment(self):
        res = self.pay(self.mallory, self.bob, self.alice, '10')
        self.assertEqual(res.status_code, 404)

    def test_invalid_payments(self):
        self.assertEqual(self.pay(self.bob, self.bob, self.bob, '10').status_code, 400)
        self.assertEqual(self.pay(self.bob, self.bob, self.alice, '0').status_code, 400)
        self.assertEqual(self.pay(self.bob, self.bob, self.alice, '-5').status_code, 400)
        self.assertEqual(self.pay(self.bob, self.bob, self.alice, 'NaN').status_code, 400)
        self.assertEqual(self.pay(self.bob, type('U', (), {'id': 99999}), self.alice, '5').status_code, 400)

    def test_payment_cannot_be_edited_as_expense(self):
        pid = self.pay(self.bob, self.bob, self.alice, '5').data['id']
        res = self.as_user(self.bob).put(f'/api/groups/{self.code}/expenses/{pid}/', {
            'description': 'x', 'amount': '5', 'paid_by': self.bob.id,
            'split_among': [self.alice.id], 'split_type': 'equal'}, format='json')
        self.assertEqual(res.status_code, 400)


class RefundTests(GroupTestBase):
    def test_refund_reverses_balances_and_keeps_original(self):
        eid = self.add_expense(self.alice, '90').data['id']
        res = self.as_user(self.alice).post(f'/api/groups/{self.code}/expenses/{eid}/refund/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(Expense.objects.get(id=eid).is_refunded)
        self.assertEqual(Expense.objects.filter(kind=Expense.REFUND).count(), 1)
        self.assertTrue(all(v == 0 for v in self.balances().values()))
        self.assertTrue(ActivityLog.objects.filter(message__contains='refunded').exists())

    def test_cannot_refund_twice(self):
        eid = self.add_expense(self.alice, '90').data['id']
        client = self.as_user(self.alice)
        client.post(f'/api/groups/{self.code}/expenses/{eid}/refund/')
        self.assertEqual(client.post(f'/api/groups/{self.code}/expenses/{eid}/refund/').status_code, 400)

    def test_refunded_expense_cannot_be_edited(self):
        eid = self.add_expense(self.alice, '90').data['id']
        client = self.as_user(self.alice)
        client.post(f'/api/groups/{self.code}/expenses/{eid}/refund/')
        res = client.put(f'/api/groups/{self.code}/expenses/{eid}/', {
            'description': 'x', 'amount': '5', 'paid_by': self.alice.id,
            'split_among': [self.alice.id], 'split_type': 'equal'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_refund_entries_cannot_be_deleted(self):
        eid = self.add_expense(self.alice, '90').data['id']
        client = self.as_user(self.alice)
        client.post(f'/api/groups/{self.code}/expenses/{eid}/refund/')
        rid = Expense.objects.get(kind=Expense.REFUND).id
        self.assertEqual(client.delete(f'/api/groups/{self.code}/expenses/{rid}/').status_code, 400)


class GroupAccessTests(GroupTestBase):
    def test_non_member_gets_404_everywhere(self):
        eid = self.add_expense(self.alice, '30').data['id']
        c = self.as_user(self.mallory)
        base = f'/api/groups/{self.code}/'
        for method, path in [
            ('get', ''), ('get', 'expenses/'), ('get', f'expenses/{eid}/'), ('get', 'balances/'),
            ('get', 'activity/'), ('get', 'settings/'), ('post', 'leave/'), ('delete', 'delete/'),
            ('post', f'expenses/{eid}/refund/'), ('delete', f'expenses/{eid}/'),
            ('delete', f'members/{self.bob.id}/'),
        ]:
            res = getattr(c, method)(base + path)
            self.assertEqual(res.status_code, 404, f'{method} {path}')

    def test_non_member_cannot_add_expense(self):
        res = self.add_expense(self.alice, '10', user=self.mallory)
        self.assertEqual(res.status_code, 404)

    def test_expense_cannot_involve_outsider(self):
        res = self.add_expense(self.alice, '10', among=[self.alice, self.mallory])
        self.assertEqual(res.status_code, 400)
        res = self.add_expense(self.mallory, '10', among=[self.alice], user=self.alice)
        self.assertEqual(res.status_code, 400)

    def test_unauthenticated_requests_rejected(self):
        self.assertEqual(APIClient().get(f'/api/groups/{self.code}/').status_code, 401)
        self.assertEqual(APIClient().get('/api/groups/').status_code, 401)

    def test_create_and_join_group(self):
        c = self.as_user(self.mallory)
        res = c.post('/api/groups/', {'name': 'Flat'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(res.data['code']), 6)
        group = Group.objects.get(code=res.data['code'])
        self.assertTrue(Membership.objects.filter(group=group, user=self.mallory).exists())
        res = self.as_user(self.bob).post('/api/groups/join/', {'code': group.code.lower()}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(ActivityLog.objects.filter(group=group, message__contains='bob joined').exists())
        self.assertEqual(self.as_user(self.bob).post('/api/groups/join/', {'code': 'ZZZZZZ'}, format='json').status_code, 404)

    def test_rename_logs_activity(self):
        self.as_user(self.bob).patch(f'/api/groups/{self.code}/settings/', {'name': 'Holiday'}, format='json')
        self.group.refresh_from_db()
        self.assertEqual(self.group.name, 'Holiday')
        self.assertTrue(ActivityLog.objects.filter(message__contains='renamed').exists())


class MembershipTests(GroupTestBase):
    def test_cannot_leave_with_balance(self):
        self.add_expense(self.alice, '90')
        res = self.as_user(self.bob).post(f'/api/groups/{self.code}/leave/')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Membership.objects.filter(user=self.bob, group=self.group).exists())

    def test_leave_when_settled_and_balances_still_work(self):
        self.add_expense(self.bob, '90')
        # settle: alice and carol repay bob
        for u in (self.alice, self.carol):
            self.as_user(u).post(f'/api/groups/{self.code}/record-payment/',
                                 {'from_user': u.id, 'to_user': self.bob.id, 'amount': '30'}, format='json')
        res = self.as_user(self.bob).post(f'/api/groups/{self.code}/leave/')
        self.assertEqual(res.status_code, 204)
        self.assertTrue(ActivityLog.objects.filter(message__contains='bob left the group').exists())
        # former member still appears in expenses: balances endpoint must not crash
        bal = self.as_user(self.alice).get(f'/api/groups/{self.code}/balances/')
        self.assertEqual(bal.status_code, 200)
        self.assertEqual({b['user']['username'] for b in bal.data['balances']}, {'alice', 'carol'})

    def test_creator_leaving_transfers_ownership(self):
        res = self.as_user(self.alice).post(f'/api/groups/{self.code}/leave/')
        self.assertEqual(res.status_code, 204)
        self.group.refresh_from_db()
        self.assertEqual(self.group.created_by, self.bob)

    def test_last_member_leaving_deletes_empty_group(self):
        solo = Group.objects.create(name='Solo', created_by=self.alice)
        Membership.objects.create(user=self.alice, group=solo)
        self.as_user(self.alice).post(f'/api/groups/{solo.code}/leave/')
        self.assertFalse(Group.objects.filter(pk=solo.pk).exists())

    def test_creator_can_remove_settled_member(self):
        res = self.as_user(self.alice).delete(f'/api/groups/{self.code}/members/{self.carol.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Membership.objects.filter(user=self.carol, group=self.group).exists())
        self.assertTrue(ActivityLog.objects.filter(message__contains='removed carol').exists())

    def test_remove_member_blocked_by_balance(self):
        self.add_expense(self.alice, '90')
        res = self.as_user(self.alice).delete(f'/api/groups/{self.code}/members/{self.carol.id}/')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Membership.objects.filter(user=self.carol, group=self.group).exists())

    def test_only_creator_can_remove_members(self):
        res = self.as_user(self.bob).delete(f'/api/groups/{self.code}/members/{self.carol.id}/')
        self.assertEqual(res.status_code, 403)

    def test_cannot_remove_self_or_nonmember(self):
        c = self.as_user(self.alice)
        self.assertEqual(c.delete(f'/api/groups/{self.code}/members/{self.alice.id}/').status_code, 400)
        self.assertEqual(c.delete(f'/api/groups/{self.code}/members/{self.mallory.id}/').status_code, 404)

    def test_only_creator_can_delete_group(self):
        self.assertEqual(self.as_user(self.bob).delete(f'/api/groups/{self.code}/delete/').status_code, 403)
        self.assertTrue(Group.objects.filter(pk=self.group.pk).exists())

    def test_cannot_delete_group_with_balances(self):
        self.add_expense(self.alice, '90')
        self.assertEqual(self.as_user(self.alice).delete(f'/api/groups/{self.code}/delete/').status_code, 400)

    def test_creator_deletes_settled_group(self):
        self.assertEqual(self.as_user(self.alice).delete(f'/api/groups/{self.code}/delete/').status_code, 204)
        self.assertFalse(Group.objects.filter(pk=self.group.pk).exists())


def make_image(fmt='PNG'):
    buf = io.BytesIO()
    Image.new('RGB', (10, 10), 'white').save(buf, fmt)
    return buf.getvalue()


class ReceiptTests(GroupTestBase):
    def payload(self, files, **extra):
        data = {
            'description': 'Lunch', 'amount': '12', 'paid_by': self.alice.id,
            'split_among': f'[{self.alice.id}, {self.bob.id}]', 'split_type': 'equal',
        }
        if files:
            data['receipts'] = files
        data.update(extra)
        return data

    def post_with_file(self, upload):
        return self.as_user(self.alice).post(
            f'/api/groups/{self.code}/expenses/', self.payload([upload]), format='multipart')

    def png(self, name='r.png'):
        return SimpleUploadedFile(name, make_image('PNG'), 'image/png')

    def test_multiple_receipts_added_and_removed(self):
        import tempfile
        from django.test import override_settings
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=tmp):
            res = self.as_user(self.alice).post(
                f'/api/groups/{self.code}/expenses/',
                self.payload([self.png('a.png'), self.png('b.png')]), format='multipart')
            self.assertEqual(res.status_code, 201)
            self.assertEqual(len(res.data['receipts']), 2)
            eid = res.data['id']
            first_id = res.data['receipts'][0]['id']
            edit = self.as_user(self.alice).put(
                f'/api/groups/{self.code}/expenses/{eid}/',
                self.payload([self.png('c.png')], remove_receipt_ids=f'[{first_id}]'), format='multipart')
            self.assertEqual(edit.status_code, 200)
            self.assertEqual(Expense.objects.get(id=eid).receipts.count(), 2)
            self.assertFalse(Expense.objects.get(id=eid).receipts.filter(id=first_id).exists())

    def test_more_than_five_rejected_on_create(self):
        res = self.as_user(self.alice).post(
            f'/api/groups/{self.code}/expenses/',
            self.payload([self.png(f'{i}.png') for i in range(6)]), format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Expense.objects.count(), 0)

    def test_more_than_five_rejected_on_edit(self):
        import tempfile
        from django.test import override_settings
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=tmp):
            res = self.as_user(self.alice).post(
                f'/api/groups/{self.code}/expenses/',
                self.payload([self.png(f'{i}.png') for i in range(5)]), format='multipart')
            self.assertEqual(res.status_code, 201)
            edit = self.as_user(self.alice).put(
                f'/api/groups/{self.code}/expenses/{res.data["id"]}/',
                self.payload([self.png('x.png')]), format='multipart')
            self.assertEqual(edit.status_code, 400)
            self.assertEqual(Expense.objects.get(id=res.data['id']).receipts.count(), 5)

    def test_non_image_rejected(self):
        res = self.post_with_file(SimpleUploadedFile('r.png', b'<script>alert(1)</script>', 'image/png'))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Expense.objects.count(), 0)

    def test_disallowed_format_rejected(self):
        res = self.post_with_file(SimpleUploadedFile('r.gif', make_image('GIF'), 'image/gif'))
        self.assertEqual(res.status_code, 400)

    def test_oversized_rejected(self):
        res = self.post_with_file(SimpleUploadedFile('r.png', make_image('PNG') + b'0' * (5 * 1024 * 1024), 'image/png'))
        self.assertEqual(res.status_code, 400)


class GroupListTests(GroupTestBase):
    def test_list_includes_member_count_and_my_balance(self):
        self.add_expense(self.alice, '90')
        res = self.as_user(self.bob).get('/api/groups/')
        self.assertEqual(res.status_code, 200)
        row = res.data[0]
        self.assertEqual(row['member_count'], 3)
        self.assertEqual(D(row['my_balance']), D('-30.00'))
        self.assertEqual(D(self.as_user(self.alice).get('/api/groups/').data[0]['my_balance']), D('60.00'))
