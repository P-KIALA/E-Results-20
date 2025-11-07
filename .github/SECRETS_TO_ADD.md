# Secrets to add in GitHub Actions

Add the following repository secrets in GitHub: Settings → Secrets and variables → Actions → New repository secret.

Recommended secret names and purpose:

- GHCR_PAT: Personal access token for GitHub Container Registry (write) used by CI to push images.
- SSH_HOST: Hostname or IP of your VPS (used by deploy step).
- SSH_USER: SSH username for deployment.
- SSH_PORT: SSH port (optional, default 22).
- SSH_PRIVATE_KEY: Private SSH key used by the CI to connect to your server.
- SSH_DEPLOY_DIR: Remote directory where the repository is deployed (used by deploy script).

Optional application secrets (map these to environment variables on the server or as runtime secrets):

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ANON_KEY
- SUPABASE_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- TWILIO_STATUS_CALLBACK_URL
- TWILIO_MESSAGING_SERVICE_SID
- TWILIO_WABA_ID
- TWILIO_API_KEY
- TWILIO_API_SECRET
- NOTIFYER_API_KEY
- INFOBIP_API_KEY

How to add secrets:

1. Go to your repository on GitHub.
2. Click Settings → Secrets and variables → Actions.
3. Click "New repository secret" and add the name and value for each secret above.
4. The CI workflow will access secrets via ${{ secrets.NAME }}.

Security notes:
- Never commit secret values to the repository.
- For runtime environment variables on your server, either add them to the server environment or use a secrets manager.

If you want, I can also update the GitHub Actions workflow file to explicitly reference the required secrets or create a small script to help bootstrap them (but I cannot add secrets to GitHub for you).
