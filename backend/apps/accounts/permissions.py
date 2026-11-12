from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    message = "Administrator access required."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and getattr(user, "is_admin_user", False))


class IsAdminRole(IsAdminUser):
    """Alias kept for dashboard/admin naming consistency."""
    pass
