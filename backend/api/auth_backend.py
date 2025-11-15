import bcrypt
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User

class SupabaseLegacyAuthBackend(ModelBackend):
    """Authentication backend that first attempts to authenticate using the
    legacy Supabase password hash stored in UserProfile.original_password_hash.

    If the legacy hash verifies, the user's password will be migrated to
    Django's native password storage (set_password).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        # Username may be passed as username or email
        email = username or kwargs.get("email") or (kwargs.get("username") if kwargs.get("username") else None)
        if not email or not password:
            return None
        email = email.lower()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return None

        # If Django already verifies the password, let ModelBackend handle it
        if user.check_password(password):
            return user

        # Otherwise attempt legacy hash verification
        try:
            profile = user.profile
        except Exception:
            profile = None

        legacy_hash = None
        if profile is not None:
            legacy_hash = getattr(profile, "original_password_hash", None)

        if not legacy_hash:
            return None

        # legacy_hash expected to be a bcrypt hash like $2b$...
        try:
            # bcrypt.checkpw requires bytes
            if isinstance(legacy_hash, str):
                legacy_hash_bytes = legacy_hash.encode("utf-8")
            else:
                legacy_hash_bytes = legacy_hash

            password_bytes = password.encode("utf-8")
            verified = bcrypt.checkpw(password_bytes, legacy_hash_bytes)
        except Exception:
            verified = False

        if verified:
            # Migrate password to Django's system
            user.set_password(password)
            user.save()
            return user

        return None
