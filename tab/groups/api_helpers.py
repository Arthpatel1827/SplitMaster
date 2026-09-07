from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound

from .models import Group


def get_member_group(user, code):
    group = get_object_or_404(Group, code=code)
    if not group.members.filter(id=user.id).exists():
        raise NotFound('Group not found.')
    return group