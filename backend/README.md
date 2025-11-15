Django backend skeleton with REST auth and Supabase user import

Quick start (development):

1. Create a virtualenv and install dependencies:
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt

2. Run migrations and create a superuser:
   python manage.py migrate
   python manage.py createsuperuser

3. Import users from Supabase (optional):
   export SUPABASE_URL="https://your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   python manage.py import_supabase_users

4. Run the dev server:
   python manage.py runserver

Notes:
- Imported users receive an unusable password. The CSV `imported_supabase_users.csv` lists imported emails; you can trigger password resets via Django admin or send reset emails.
- Settings use SQLite by default for simplicity; update DATABASES in project/settings.py for production (use DATABASE_URL or full Django database settings).
- JWT authentication is provided via djangorestframework-simplejwt; the tokens returned by /api/auth/login are standard JWT access tokens.
