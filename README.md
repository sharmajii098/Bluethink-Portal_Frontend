> **BlueThink V23.5:** AI chat failures distinguish model/database/unexpected errors; failed questions stay editable for retry. See top-level V23_5_AI_CHAT_FAILURE_RECOVERY_RELEASE_NOTES.md. Staging tests pending; not production-certified.

> **BlueThink V23.4:** AI-wide no-store responses including auth/error paths, a separately budgeted AI-chat request limiter, and corrected deny metrics. See top-level V23_4_AI_PRIVACY_RATE_GUARD_RELEASE_NOTES.md. Staging verification required; not production-certified.

## V22.7: action recovery and admin diagnostics

The AI Actions dialog now preserves ambiguous submission status, requests the account-bound token state, blocks another draft until the user confirms they checked the business module, and shows admin-only read-only 24-hour or seven-day aggregate monitoring. No auto-retries or new automatic approvals were added. See root `V22_7_PHASE6_MONITORING_RECOVERY_RELEASE_NOTES.md`.

# BlueThink frontend

See `../README.md` for the consolidated workflows and exact test/build limitations.

Use Node 22. Keep `package-lock.json`; run `npm ci`, `npm test`, and `npm run build`. A production build must pass both TypeScript checking and Vite bundling. Do not infer a production-build pass from syntax parsing or utility tests.

For development run `npm run dev`. `VITE_API_BASE_URL` defaults to `/api`; check the existing Vite proxy/your backend port. The optional Windows repair scripts must retain the lockfile. Never put JWT signing secrets, SMTP passwords or OAuth client secrets into any `VITE_` environment variable.

New screens: Calendar Connections (all roles), Payroll Reconciliation (HR/Admin), Letter Templates (HR/Admin), improved Letters & Certificates, and Organization Calendar's invitation/reminder/sync dialogs. OAuth callbacks use `/calendar/oauth/callback/google` and `/calendar/oauth/callback/microsoft` and require the same signed-in tab.

The 29 existing Node tests passed for V22.2 here using the environment's available TypeScript compiler. Full dependency installation, dependency-aware type checking, Vite build and browser/responsive testing were not verified. The optional `tests/chat-session.check.mjs` additionally needs compatible react-test-renderer; it was not run here and is not silently included in the utility-test count.

### AI Actions (V22.3)
The AI Assistant's **AI Actions** dialog supports prepared, explicitly confirmed self-service support tickets, leave requests and general timesheets. It calls `/api/ai/actions/preview` and `/api/ai/actions/confirm`. See the root `V22_3_PHASE3_CONFIRMED_ACTIONS_RELEASE_NOTES.md` for restrictions and deployment checks.

### AI Reviewer Actions (V22.4)
For authorized Manager/HR/Admin users, the AI Actions panel adds **Review leave** and **Review timesheet**. A reviewer selects a pending request from the authorized backend queue, opens the full underlying record for inspection, makes a human decision, enters rationale and confirms a server-issued one-time preview. Employee-role users cannot use reviewer endpoints. See `../V22_4_PHASE3B_APPROVAL_ASSISTANCE_RELEASE_NOTES.md`.

### AI Expense and Draft Assistance (V22.5)
The AI Actions dialog now includes expense claims (server-approved one-time preview and human confirmation). Users may *opt in* to an editable draft suggestion from only the current on-screen chat's last user message. Suggestions never set approvals, owner IDs or status and never send any record. Closing/editing a pending preview makes a best-effort cancellation call to `POST /api/ai/actions/cancel`. See `../V22_5_PHASE4_DRAFT_EXPENSE_SAFETY_RELEASE_NOTES.md` for validation and remaining deployment work.

## V24.4 private action recovery history

After an uncertain AI submission, the action dialog offers a read-only list of the current account's last 12 actions within 24 hours. It never retries a submission or clears the unresolved warning automatically. The backend validates current HRMS role and account scope. No raw preview token is persisted in browser storage.
