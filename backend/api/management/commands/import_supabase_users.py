import os
import csv
import requests
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import UserProfile

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class Command(BaseCommand):
    help = "Import users from Supabase into Django auth.User and create profiles"

    def handle(self, *args, **options):
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            self.stderr.write(self.style.ERROR("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment"))
            return

        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        }

        # fetch users
        url = f"{SUPABASE_URL}/rest/v1/users?select=id,email,role,permissions,password_hash,primary_site_id,created_at,updated_at"
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            self.stderr.write(self.style.ERROR(f"Failed to fetch users from Supabase: {resp.status_code} {resp.text}"))
            return

        users = resp.json() or []
        created = 0
        csv_rows = []
        for u in users:
            email = (u.get("email") or "").lower()
            if not email:
                continue
            if User.objects.filter(email__iexact=email).exists():
                continue
            username = email
            user = User.objects.create_user(username=username, email=email)
            # Do not set password because original hash may be incompatible; make unusable and record original hash
            user.set_unusable_password()
            user.first_name = u.get("first_name") or ""
            user.last_name = u.get("last_name") or ""
            user.is_staff = (u.get("role") == "admin")
            user.save()

            profile = UserProfile.objects.create(
                user=user,
                role=u.get("role"),
                permissions=u.get("permissions"),
                primary_site_id=u.get("primary_site_id"),
                original_password_hash=u.get("password_hash"),
            )

            csv_rows.append({"email": email, "id": u.get("id")})
            created += 1

        # write CSV with users that need password reset or manual handling
        out_path = "imported_supabase_users.csv"
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["email", "id"])
            writer.writeheader()
            for r in csv_rows:
                writer.writerow(r)

        self.stdout.write(self.style.SUCCESS(f"Imported {created} users. CSV written to {out_path}"))
