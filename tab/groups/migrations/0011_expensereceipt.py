import django.db.models.deletion
from django.db import migrations, models


def copy_receipts(apps, schema_editor):
    Expense = apps.get_model('groups', 'Expense')
    ExpenseReceipt = apps.get_model('groups', 'ExpenseReceipt')
    for exp in Expense.objects.exclude(receipt='').exclude(receipt__isnull=True):
        ExpenseReceipt.objects.create(expense=exp, image=exp.receipt.name)


def restore_receipts(apps, schema_editor):
    Expense = apps.get_model('groups', 'Expense')
    ExpenseReceipt = apps.get_model('groups', 'ExpenseReceipt')
    for exp in Expense.objects.all():
        first = ExpenseReceipt.objects.filter(expense=exp).order_by('id').first()
        if first:
            exp.receipt = first.image.name
            exp.save(update_fields=['receipt'])


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0010_alter_activitylog_id_alter_expense_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ExpenseReceipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='receipts/%Y/%m/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expense', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='receipts', to='groups.expense')),
            ],
            options={'ordering': ['id']},
        ),
        migrations.RunPython(copy_receipts, restore_receipts),
        migrations.RemoveField(model_name='expense', name='receipt'),
    ]
