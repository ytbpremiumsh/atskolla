# Operational reliability and Parent 2.1.0

## Deployment order

1. Review and deploy `supabase/migrations/20261107033501_operational_reliability.sql` to the ATSkolla database. It only adds scoped reporting/health/backup functions and their permissions. It does not mark invoices paid, move funds, or delete records.
2. Deploy `database-backup` and `gdrive-backup`, including `_shared/backup.ts`, after the migration. Their existing super-admin authentication stays required. JSON exports include public application tables discovered from the database, deterministic primary-key pagination and failure propagation. These are not a consistent database snapshot and do not include Auth users, schema/DDL or Storage object bytes. Keep provider backups and test restores separately.
3. Publish the website from the tested commit. Reporting uses the RPC when present, with a paginated RLS-protected fallback while deployment is pending. Operations health reports unavailable explicitly if its migration is absent.
4. Install and test the Parent build, then sign with the owner's existing upload key and complete Play Console requirements. Never commit a keystore/password. No application has been published to Google Play by this change.

## Production verification

- Confirm the DOKU reconciliation cron is active and has recent successful runs. A success result means the job executed, not that every pending payment has been paid. Review `review`, overdue attempts, provider responses and webhook errors. Never disable signature/amount checks to force a paid status.
- Compare principal totals against full invoice/installment/cash ledgers for the same school. Cross-school and unauthenticated RPC calls must fail. A zero net amount must remain zero.
- Payment confirmation and bank settlement differ. Elapsed time, a T+1 date, a redirect and a linked withdrawal id do not prove money reached the school bank. Split balances stay awaiting bank confirmation until a verified provider receipt is integrated. The application currently has no automatic DOKU bank-receipt feed.
- Export application data, verify manifest covers invoice attempts, installments, bank accounts and cash book, and restore only to an isolated test environment with the matching Auth users/schema/Storage. Restore upsert is not transactional and can partially succeed; inspect every result. Destructive replace is disabled.
- Verify `/kebijakan-privasi` and `/penghapusan-akun` publicly, including mobile layouts and email request path. The privacy contact must be monitored; requests require actual handling with the school and providers. Publishing a page does not complete an account deletion request or establish all organizational compliance duties.

## Parent 2.1.0

- API 36, min API 26. Version code 31 retains `com.atskolla.parent`.
- Opt-in announcement notifications use Android JobScheduler at a minimum interval of 15 minutes. Android/Doze/network/battery restrictions can delay them. This is **periodic checking, not real-time push**. It needs no Firebase credentials and does not read messages in the background or mark teacher messages as read.
- Android 13+ notification permission is requested only after the user enables the feature. Denial keeps announcements accessible in-app. The notification contains no student identity/content. Opt-out and logout cancel jobs and notifications. Jobs are rescheduled after opening the app; this build does not request boot startup or exact alarms.
- Home/announcement screens refresh while visible without refreshing input forms. Payment state still comes from the backend, never the browser redirect.
- Exercise login/session expiry, multiple children, opt-in/deny/disable, battery saver, logout, cache clearing, notification opening, attachments and gateway sandbox on physical devices. Synthetic emulator fixtures do not replace account-backed end-to-end tests.

## Sources checked 7 November 2026

- https://support.google.com/googleplay/android-developer/answer/10144311
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://developer.android.com/google/play/requirements/target-sdk
- https://developer.android.com/develop/ui/views/notifications/notification-permission
- https://developer.android.com/reference/android/app/job/JobInfo.Builder
- https://peraturan.bpk.go.id/Details/229798/uu-no-27-
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/changelog/supabase-cli-v3

The owner's actual Play listing, Data safety answers, signing key, retention practices, provider agreements and handling of guardian consent must match the implementation. No claim of Google Play approval or complete legal certification is made.
