# Hearth & Harbor — personal-life app MVP

Hearth & Harbor is a responsive, dark, self-hosted/cloud-ready web app foundation for Poppy’s everyday life. It is designed to feel calm and premium on a Windows PC and an iPhone 13, with a black sidebar, deep blue workspace, black surfaces, and restrained purple-blue accents.

## Run it

This first version has no build step or package dependency.

1. Open the top-level `outputs/index.html` entry page, open `father-life-app/index.html` directly, or use `http://localhost:8080` / `http://localhost:8081` when the preview server is running. Both local routes open the Hearth & Harbor launcher.
2. Use the left navigation to explore Overview, Planner, Knowledge Vault, Family Space, AI Companion, Personal Space, and Settings.
3. Tasks and the welcome setup are persisted in the browser’s local storage for this preview.

For a local static server on Windows, the folder can be served by an existing static-file server of your choice. No credentials, paid services, or external APIs are required for this preview.

## What is working in this MVP

- Responsive desktop/mobile layout, including a collapsible mobile sidebar.
- Black sidebar with separate private-space status indicator.
- Dashboard widgets for today, assistant suggestion, family notes, and weekly momentum.
- Planner with Agenda, Tasks, and Kanban views.
- Add-task flow with date, time, and status; task completion persists locally.
- Knowledge Vault cards with search and keyboard shortcut (`Ctrl/Cmd + K`).
- Private Family Space presentation with limited-member framing and activity feed.
- Private family chat preview with local message sending and voice/video call screens.
- Family members can be removed with an in-app confirmation.
- Personal Space reflection, routines, and Settings surfaces.
- Selectable Settings categories.
- Two selectable assistant options: Hearth Companion preview and OpenAI server integration.
- Planner task entry stays open so multiple tasks can be added in sequence.
- Knowledge Vault notes can be added repeatedly and persist in the local preview.
- Knowledge Vault cards stay clean and colourful; opening one reveals a private annotated workspace with pen, highlighter, eraser, colour choices, and drawing canvas.
- AI Companion has its own sidebar section with Hearth Companion and OpenAI choices.
- Birthday welcome/setup flow, permission language, and clear “nothing changes without your approval” assistant behavior.
- Mobile-first touch targets and layouts suitable for iPhone 13 dimensions.

## Architecture boundary

The current deliverable is a static UI prototype. The boundary is deliberately explicit:

```text
Browser UI
  ├─ Local preview state (localStorage only)
  ├─ UI approval queue (visual placeholder)
  └─ Integration seams to add later
       ├─ Authentication service (email/password, passkey, 2FA)
       ├─ Encrypted application API and database
       ├─ Calendar adapters (Google / Apple, two-way sync)
       ├─ AI orchestration service with permission checks
       ├─ Separate memory profiles and user-controlled retention
       ├─ Research retrieval service with citations
       ├─ Family accounts and role-based access control
       ├─ Encrypted, recoverable backups
       └─ Offline cache / sync queue
```

Recommended production implementation:

- Frontend: React/TypeScript or another typed component framework, with an installable PWA shell for maximum practical offline support.
- API: a small backend-for-frontend with strict authorization on every resource and a server-side approval ledger for AI actions.
- Identity: WebAuthn/passkeys plus a strong password fallback and TOTP or equivalent 2FA. Store only salted password hashes; keep recovery codes encrypted and single-use.
- Data: Postgres (or equivalent) with tenant/user ownership on every row, encrypted secrets, audit events, and separate tables/namespaces for personal, family, and assistant memory.
- Sync: provider-specific OAuth with least-privilege scopes, encrypted refresh tokens, conflict records, and an explicit “AI may prepare / user must approve” rule for calendar writes.
- Research: server-side retrieval with source URLs, timestamps, and a citation record saved only after user approval.
- Backups: encrypted, versioned, tested restores; show the last successful backup and allow a user-initiated export.

## Privacy and safety notes

- No clinic or medical functionality is included.
- No credentials are invented or embedded.
- No calendar, email, streaming, AI, storage, or paid service is connected by this preview.
- Family Space and Personal Space are presented as separate boundaries; the backend must enforce that separation, not just the UI.
- AI actions must be represented as proposals until the authenticated owner approves them. Research results should retain their citations and should not be silently written to the Knowledge Vault.
- Local storage is only suitable for demonstration data. Do not store real secrets or sensitive personal records there in production.

## OpenAI API key

No OpenAI API key is generated or embedded in this app. API keys are credentials and must be created by the account owner in the OpenAI platform, then supplied to a server-side integration through a secret manager or environment variable such as `OPENAI_API_KEY`. Never put the key in `index.html`, `app.js`, browser local storage, or a public repository. The Settings screen intentionally shows the assistant as “Not connected” until that secure backend boundary exists.

## Next steps

1. Choose hosting and identity provider, then define the user/session model.
2. Add a typed API with authorization tests and an encrypted secrets store.
3. Add the data model for tasks, calendar events, notes, memories, family members, devices, approvals, and backups.
4. Add PWA service worker, local sync queue, conflict resolution, and a visible offline state.
5. Implement OAuth connections only after explicit parental approval and provider setup.
6. Add audit logging, export/delete controls, backup restore tests, rate limits, CSRF protection, secure headers, and dependency scanning.
7. Replace preview toasts with authenticated workflows and end-to-end tests across desktop and iPhone 13 breakpoints.
