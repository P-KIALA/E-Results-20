from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=50, blank=True, null=True)
    permissions = models.JSONField(blank=True, null=True)
    primary_site_id = models.CharField(max_length=255, blank=True, null=True)
    original_password_hash = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Profile for {self.user.email}"
