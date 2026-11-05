# Runbook

## Where things are

- Code: github.com/shykeys-data/meetoluwaseyi (`dev` = staging, version tags = production)
- Host: genuss.ng control panel → Setup Node.js App (one app per environment)
- Database: MySQL on the same host; backups by JetBackup
- Deploy log: `~/logs/deploy-<env>.log` on the host

## First launch of an environment

1. Control panel → MySQL Management: create a database and user (let the panel generate the password).
2. Control panel → Setup Node.js App: the app's environment variables need `DATABASE_URL`,
   `SESSION_SECRET` (48+ random characters), `IP_HASH_SALT` (24+), `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`
   (14+), and on staging `STAGING_PASSWORD` (12+). Save, then Run NPM Install once.
3. On start the app applies migrations, loads the launch content into an empty database, and creates the
   admin. Sign in at /myadm with the email and initial password: it shows a 2FA key for your
   authenticator app and asks for one code. After that, delete `ADMIN_INITIAL_PASSWORD`.

## Deploy

Push to `dev` → CI → `deploy/staging` → the server pulls within 5 minutes.
Production: tag a commit that passed on staging (`git tag v1.0.0 && git push --tags`), approve it in
GitHub → Environments → production.

## Roll back

- Automatic if `/readyz` fails after a deploy.
- Manual: re-run the CI "publish" job for an older tag, or tag the last good commit with a new version.

## Restore the database

JetBackup → Database backups → pick a date → restore into the **staging** database first, check the site,
then restore production. Monthly drill: restore last night's production backup into staging.

## Rotate a leaked key

1. Create a new key at the provider (Resend, Meta, Cloudflare, Cloudinary).
2. Update it in the Node.js app's environment variables, then restart the app.
3. Revoke the old key. For SESSION_SECRET: changing it signs everyone out and needs the admin 2FA
   re-enrolled (`node dist/jobs/cli.js create-admin`).

## Check alerts work

- Stop the staging app → UptimeRobot should alert within 5 minutes.
- Send a test message on staging → email and WhatsApp arrive; a failed alert shows in the admin inbox.

## Useful commands (from the app's virtual environment)

```
node dist/jobs/cli.js check          # config is valid
node dist/jobs/cli.js migrate        # apply database changes (also runs on every start)
node dist/jobs/cli.js create-admin   # create or reset the admin (prints the 2FA secret once)
node dist/jobs/cli.js daily          # delete messages older than 24 months, sync GitHub
```
