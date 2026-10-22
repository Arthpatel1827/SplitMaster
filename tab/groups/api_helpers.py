from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound, ValidationError

from .models import Group

MAX_AMOUNT = Decimal('99999999.99')
CENT = Decimal('0.01')
BALANCE_TOLERANCE = Decimal('0.005')

MAX_RECEIPT_BYTES = 5 * 1024 * 1024
MAX_RECEIPTS_PER_EXPENSE = 5
ALLOWED_RECEIPT_FORMATS = {'JPEG', 'PNG', 'WEBP'}


def get_member_group(user, code):
    """Return the group only if `user` is a member; otherwise 404 (never reveal that it exists)."""
    group = get_object_or_404(Group, code=code)
    if not group.members.filter(id=user.id).exists():
        raise NotFound('Group not found.')
    return group


def parse_money(raw, field='amount'):
    """Parse a positive, finite, 2-decimal money value or raise ValidationError."""
    try:
        value = Decimal(str(raw).strip())
    except (InvalidOperation, TypeError, ValueError, AttributeError):
        raise ValidationError({'detail': 'Enter a valid amount.'})
    if not value.is_finite():
        raise ValidationError({'detail': 'Enter a valid amount.'})
    if value > MAX_AMOUNT:
        raise ValidationError({'detail': 'That amount is too large.'})
    value = value.quantize(CENT)
    if value <= 0:
        raise ValidationError({'detail': 'Amount must be greater than zero.'})
    return value


def validate_receipt(file):
    """Reject anything that is not a reasonably sized JPEG/PNG/WEBP image."""
    from PIL import Image, UnidentifiedImageError

    if file.size > MAX_RECEIPT_BYTES:
        raise ValidationError({'detail': 'Receipt photo must be 5 MB or smaller.'})
    try:
        img = Image.open(file)
        fmt = img.format
        img.verify()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError):
        raise ValidationError({'detail': 'The receipt must be a valid image file.'})
    finally:
        file.seek(0)
    if fmt not in ALLOWED_RECEIPT_FORMATS:
        raise ValidationError({'detail': 'Receipt must be a JPEG, PNG or WEBP image.'})
    return file
