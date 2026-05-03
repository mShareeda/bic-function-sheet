# BIC Function Sheet

Internal event coordination webapp for **Bahrain International Circuit (BIC)**. Replaces the spreadsheet/email workflow for managing multi-department events — from sales confirmation through live execution.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Roles & Permissions](#roles--permissions)
4. [Event Lifecycle](#event-lifecycle)
5. [Folder Structure](#folder-structure)
6. [Local Setup](#local-setup)
7. [Environment Variables](#environment-variables)
8. [Database](#database)
9. [Authentication](#authentication)
10. [Notifications](#notifications)
11. [PDF Export](#pdf-export)
12. [File Attachments](#file-attachments)
13. [Calendar](#calendar)
14. [Audit Log](#audit-log)
15. [API Routes & Cron](#api-routes--cron)
16. [Deployment (Vercel)](#deployment-vercel)
17. [Enabling Microsoft 365 SSO](#enabling-microsoft-365-sso)
18. [Seeded Departments](#seeded-departments)

---

## Overview

When BIC receives a confirmed event booking, an events admin creates it in this system and assigns an **Event Coordinator**. The coordinator builds the agenda (setup → live → breakdown windows), selects which departments are involved, and writes per-department requirements. When ready, the coordinator clicks **Send Function Sheet** — every involved department manager is notified by in-app bell and email (with the full PDF attached).

Department managers log in, see the complete function sheet, edit only their own department's section, assign team members, and leave private notes that only the coordinator can read. Team members see a focused "My Tasks" page showing only their assignments.

Admins have full visibility: all events, all departments, full audit log, and user management.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^15.1.0 |
| Language | TypeScript | ^5 |
| UI | Tailwind CSS + shadcn/ui | latest |
| ORM | Prisma | ^5.22.0 |
| Database | PostgreSQL (Neon serverless) | — |
| Auth | Auth.js (NextAuth v5) | 5.0.0-beta.25 |
| Password hashing | argon2 (argon2id) | ^0.41.1 |
| Validation | Zod | ^3.23.8 |
| Email | Resend + react-email | ^4.0.1 |
| PDF | @react-pdf/renderer | ^4.1.5 |
| Calendar | FullCalendar (daygrid + timegrid) | ^6.1.15 |
| File storage | Azure Blob Storage (prod) / LocalDisk (dev) | ^12.25.0 |
| Date utilities | date-fns + date-fns-tz | ^4.1.0 / ^3.2.0 |
| React | React | ^19.0.0 |

---

## Roles & Permissions

A user can hold multiple roles simultaneously (e.g., both ADMIN and COORDINATOR).

### Role descriptions

| Role | Description |
|---|---|
| `ADMIN` | Full system access. Manages users, departments, venues. Sees all events and the global audit log. |
| `COORDINATOR` | Assigned per event. Builds agenda, writes requirements, sends function sheet, sees manager-only notes. |
| `DEPT_MANAGER` | Assigned to a department. Sees full function sheet for events involving their dept. Edits own dept's requirements. Assigns team members. Writes manager-only notes. |
| `DEPT_TEAM_MEMBER` | Sees only their assigned tasks on `/my-tasks`. View-only. |

### Permission matrix

| Action | Admin | Coordinator (assigned) | Dept Manager (dept on event) | Team Member (assigned) |
|---|---|---|---|---|
| Create / edit event header | Yes | Yes | — | — |
| Build agenda | Yes | Yes | — | — |
| Add / remove departments from event | Yes | Yes | — | — |
| Edit own dept requirements | Yes | Yes (any dept) | Yes | — |
| Edit other dept requirements | Yes | Yes | — | — |
| Assign team member to requirement | Yes | Yes | Yes (own dept only) | — |
| Add manager-only note | Yes | — | Yes (own dept) | — |
| View manager-only notes | Yes | Yes (reads all) | Own dept only | — |
| Send function sheet | Yes | Yes | — | — |
| View full function sheet | Yes | Yes | Yes (read-all) | — |
| Export PDF | Yes | Yes | Yes | — |
| View global audit log | Yes | — | — | — |
| Manage users / departments / venues | Yes | — | — | — |

### Event list visibility

- **Admin** — all events
- **Coordinator** — events they are assigned to coordinate
- **Dept Manager** — events where their department is in `EventDepartment`
- **Team Member** — events where they have at least one `RequirementAssignment`

---

## Event Lifecycle

```
DRAFT ──► CONFIRMED ──► FUNCTION_SHEET_SENT ──► IN_SETUP ──► LIVE ──► CLOSED ──► ARCHIVED
```

| Status | Meaning |
|---|---|
| `DRAFT` | Created, details still being filled in |
| `CONFIRMED` | Booking confirmed; coordinator assigned |
| `FUNCTION_SHEET_SENT` | Coordinator sent the sheet; dept managers notified |
| `IN_SETUP` | Event setup underway |
| `LIVE` | Event is live |
| `CLOSED` | Event has ended |
| `ARCHIVED` | Archived for record-keeping |

### Function sheet send workflow

1. Coordinator completes agenda + requirements for all departments.
2. Clicks **Send Function Sheet** — event status transitions to `FUNCTION_SHEET_SENT`.
3. System writes `Notification` rows for every manager of every involved department.
4. Each manager receives an in-app bell notification + email with the PDF attached.
5. Any subsequent edits to the event create `FUNCTION_SHEET_UPDATED` notifications; these are batched into a daily digest email (cron at midnight UTC).

---

## Folder Structure

```
BIC Function Sheet/
├── app/
│   ├── (auth)/                      # Public auth pages (no session required)
│   │   ├── signin/
│   │   ├── auth-error/
│   │   ├── forgot-password/
│   │   ├── reset-password/[token]/
│   │   └── change-password/
│   ├── (app)/                       # Protected pages (session guard in layout.tsx)
│   │   ├── layout.tsx               # Session check + mustChangePassword redirect
│   │   ├── dashboard/               # Role-aware landing page with stats
│   │   ├── calendar/                # FullCalendar month/week/day view
│   │   ├── notifications/           # Notification inbox
│   │   ├── my-tasks/                # Team member view (own assignments only)
│   │   ├── events/
│   │   │   ├── page.tsx             # Event list (filtered by role)
│   │   │   ├── new/                 # Create event form
│   │   │   └── [eventId]/
│   │   │       ├── page.tsx         # Function sheet view (role-aware)
│   │   │       ├── edit/            # Edit event header + inline requirements
│   │   │       ├── agenda/          # Agenda editor
│   │   │       ├── departments/     # Department picker
│   │   │       ├── requirements/
│   │   │       │   ├── page.tsx     # All depts (coordinator view)
│   │   │       │   └── [deptId]/    # Single dept (manager or coordinator)
│   │   │       ├── audit/           # Per-event audit log
│   │   │       └── pdf/route.ts     # PDF stream endpoint
│   │   └── admin/
│   │       ├── users/               # User list + create
│   │       ├── users/[id]/          # Edit user roles + dept memberships
│   │       ├── departments/         # Department management
│   │       ├── venues/              # Venue management
│   │       └── audit/               # Global audit log (grouped by event)
│   └── api/
│       ├── auth/[...nextauth]/      # Auth.js route handler
│       ├── attachments/upload/      # Returns signed upload URL
│       ├── attachments/[id]/        # Authenticated download proxy
│       └── cron/digest/             # Edit-after-send email digest (Vercel Cron)
├── components/
│   ├── ui/                          # shadcn/ui primitives
│   ├── events/                      # Event-related components
│   ├── admin/                       # Admin-specific components
│   ├── calendar/                    # FullCalendar wrapper
│   ├── notifications/               # Bell + inbox components
│   └── pdf/
│       └── function-sheet-document.tsx   # @react-pdf/renderer document
├── lib/
│   ├── auth.ts                      # Auth.js config (Credentials + dormant M365)
│   ├── authz.ts                     # Policy predicates + useAbility() hook
│   ├── db.ts                        # Prisma client singleton
│   ├── password.ts                  # argon2 hash/verify, policy check, tokens
│   ├── audit.ts                     # logAudit() helper
│   ├── notifications.ts             # notify() — writes DB rows + queues email
│   ├── mailer.ts                    # Resend (prod) / Console (dev) mailer
│   ├── storage.ts                   # AzureBlob (prod) / LocalDisk (dev) storage
│   ├── pdf.ts                       # renderFunctionSheetPdf()
│   └── validators/                  # Zod schemas
├── server/
│   └── actions/
│       ├── auth.ts                  # signIn, signOut, changePassword, forgotPassword, resetPassword
│       ├── admin.ts                 # User/dept/venue CRUD
│       ├── events.ts                # Create/update event, status transitions, send sheet
│       ├── agenda.ts                # Upsert/delete agenda items
│       ├── requirements.ts          # Requirements, assignments, notes, venues
│       └── notifications.ts         # markAllRead, markRead
├── emails/                          # react-email templates
├── prisma/
│   ├── schema.prisma                # Full data model
│   └── seed.ts                      # 18 departments + bootstrap admin
├── middleware.ts                    # Session guard (redirect to /signin)
├── vercel.json                      # Cron schedule (daily digest at midnight)
├── next.config.mjs
├── tailwind.config.ts
└── .env                             # Local environment (never commit)
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database (or any PostgreSQL connection string)
- Git

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd "BIC Function Sheet"

# 2. Install dependencies
npm install

# 3. Create .env and fill in your values (see Environment Variables section)

# 4. Push schema and run seed
npx prisma migrate dev --name init
npx prisma db seed

# 5. Start the dev server
npm run dev
```

The dev server runs at **http://localhost:3000**.

### Bootstrap admin credentials

The seed creates one admin account:

| Field | Value |
|---|---|
| Email | `admin@bic.local` |
| Temporary password | `sZhRsy7KUWG9CS` |

You will be forced to change this password on first sign-in.

> In development, all emails are **logged to the console** (not sent). Temporary passwords for new users appear in the terminal output.

---

## Environment Variables

Create a `.env` file in the project root. **Never commit this file.**

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (Neon or any Postgres) |
| `AUTH_SECRET` | Yes | — | Random 32-byte secret for Auth.js JWT signing. Generate: `openssl rand -base64 32` |
| `AUTH_M365_ENABLED` | No | `false` | Set to `true` to activate Microsoft 365 / Entra ID SSO |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | If M365 | — | Azure App Registration client ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | If M365 | — | Azure App Registration client secret |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | If M365 | — | `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| `NEXT_PUBLIC_AUTH_M365_ENABLED` | No | `false` | Shows "Sign in with Microsoft" button in the UI |
| `MAIL_DRIVER` | No | `console` | `console` (log to stdout) or `resend` (send real email) |
| `RESEND_API_KEY` | If resend | — | Resend API key |
| `EMAIL_FROM` | If resend | — | Sender address, e.g. `noreply@bic.com.bh` |
| `STORAGE_DRIVER` | No | `local` | `local` (disk) or `azure` (Azure Blob) |
| `STORAGE_LOCAL_DIR` | No | `./storage` | Directory for local file storage (dev only) |
| `AZURE_STORAGE_CONNECTION_STRING` | If azure | — | Azure Blob Storage connection string |
| `AZURE_STORAGE_CONTAINER` | If azure | `attachments` | Azure Blob container name |
| `APP_URL` | No | `http://localhost:3000` | Public base URL (used in email deep links) |
| `CRON_SECRET` | Prod | — | Bearer token to secure `/api/cron/digest` |
| `MAX_ATTACHMENT_BYTES` | No | `26214400` | Maximum upload file size (default 25 MB) |

### Example `.env` (development)

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
AUTH_SECRET="your-random-secret-here"
AUTH_M365_ENABLED="false"
NEXT_PUBLIC_AUTH_M365_ENABLED="false"
MAIL_DRIVER="console"
STORAGE_DRIVER="local"
STORAGE_LOCAL_DIR="./storage"
APP_URL="http://localhost:3000"
```

---

## Database

### Technology

- **PostgreSQL** via [Neon](https://neon.tech) (serverless, works identically for local dev and Vercel production)
- **Prisma ORM** with the Prisma Client JS generator

### Schema overview

| Model | Purpose |
|---|---|
| `User` | All system users. Admin-managed, no public sign-up. |
| `PasswordResetToken` | One-time reset tokens (1-hour expiry) |
| `UserRole` | Many-to-many: user ↔ role enum |
| `Department` | 18 seeded BIC departments |
| `DepartmentMember` | User ↔ department membership, with `isManager` flag |
| `Venue` | Named venues for agenda items and events |
| `EventVenue` | Which venues are associated with a given event |
| `Event` | Core event record with status, time windows, VIP flag |
| `AgendaItem` | Ordered agenda entries within an event |
| `EventDepartment` | Which departments are involved in an event |
| `DepartmentRequirement` | Per-department task/requirement for an event |
| `RequirementAssignment` | Team member assigned to a requirement |
| `RequirementNote` | Manager-only notes (visible to coordinator + admin only) |
| `Attachment` | Files attached to an event or a requirement |
| `Notification` | In-app bell notifications |
| `AuditLog` | Append-only action log across all entities |

### Key fields on `Event`

| Field | Type | Notes |
|---|---|---|
| `title` | String | Event name |
| `status` | Enum | See event lifecycle |
| `eventDate` | DateTime | Main event date |
| `maximizerNumber` | String? | External reference from Maximizer CRM |
| `isVip` | Boolean | VIP events get visual treatment in UI + PDF |
| `estimatedGuests` | Int? | Single guest count estimate |
| `clientName` / `clientContact` | String? | Client details |
| `setupStart/End` | DateTime | Setup window |
| `liveStart/End` | DateTime | Live event window |
| `breakdownStart/End` | DateTime | Breakdown window |
| `functionSheetSentAt` | DateTime? | Set when sheet is first sent |
| `lastEditedAfterSendAt` | DateTime? | Tracks post-send edits for digest |

### Migrations

```bash
# Create a migration after schema changes
npx prisma migrate dev --name <description>

# Apply migrations in production (CI / Vercel build)
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

---

## Authentication

### Active method: Email + Password

- Credentials provider via **Auth.js v5**
- Passwords hashed with **argon2id** (`argon2` package)
- JWT session cookies — HttpOnly, Secure, SameSite=Lax
- Session duration: **12-hour idle / 30-day absolute**

### Password policy

- Minimum 10 characters
- Must contain at least one letter and one digit
- Enforced in `lib/password.ts:validatePasswordPolicy()`

### Account management

- **No public sign-up.** Admins create accounts at `/admin/users/new`.
- New accounts have `mustChangePassword: true` — user is redirected to `/change-password` on first sign-in.
- Admin can reset any user's password from the user management page.
- Self-service forgot password: `/forgot-password` → email link → `/reset-password/[token]` (1-hour single-use token).

### Lockout policy

- 10 consecutive failed login attempts within 1 hour → account soft-locked for **15 minutes**
- Tracked on `User.failedLoginAttempts` and `User.lockedUntil`
- Resets automatically on successful login

### Microsoft 365 / Entra ID SSO (scaffolded, disabled)

The M365 provider is fully wired in `lib/auth.ts` but inactive by default. See [Enabling Microsoft 365 SSO](#enabling-microsoft-365-sso).

---

## Notifications

### In-app bell

Every trigger creates a `Notification` row in the database. The bell icon in the nav shows the unread count. `/notifications` shows the full inbox with mark-read controls.

### Email

- Sent via **Resend** in production (`MAIL_DRIVER=resend`).
- Logged to the terminal in development (`MAIL_DRIVER=console`) — no real emails sent.
- Templates are React components in `emails/`.

### Notification triggers

| Trigger | Recipients | In-app | Email |
|---|---|---|---|
| Coordinator assigned to event | New coordinator | Yes | Yes |
| Function sheet sent | All dept managers on event | Yes | Yes (PDF attached) |
| Edit after sheet sent | All dept managers on event | Yes (per change) | Yes (daily digest) |
| Team member assigned to requirement | The team member | Yes | Yes |
| Manager-only note added | Event coordinator | Yes | Yes |
| Event status → CLOSED | Coordinator + involved managers | Yes | Yes |

### Edit-after-send digest

After the function sheet is sent, any changes create `FUNCTION_SHEET_UPDATED` notifications. The digest cron at `/api/cron/digest` (scheduled daily at midnight UTC) batches all undelivered notifications per `(userId, eventId)` into one summary email and marks them delivered.

---

## PDF Export

- **Endpoint:** `GET /events/[eventId]/pdf`
- **Rendered server-side** using `@react-pdf/renderer`
- **Component:** `components/pdf/function-sheet-document.tsx`
- **Helper:** `lib/pdf.ts:renderFunctionSheetPdf(eventId): Promise<Buffer>`

The PDF includes: event header (title, date, client, VIP flag, Maximizer number), schedule summary (setup/live/breakdown windows), full agenda table, and one section per involved department listing its requirements.

PDF export is available to: **Admin**, **Coordinator**, **Dept Manager**.

---

## File Attachments

Attachments can be added to **events** (event-level files) or to individual **requirements**. Maximum file size: **25 MB** (configurable via `MAX_ATTACHMENT_BYTES`).

Storage is abstracted behind `lib/storage.ts`:

| Driver | Environment | Required config |
|---|---|---|
| `LocalDiskStorage` | Development | `STORAGE_DRIVER=local`, `STORAGE_LOCAL_DIR=./storage` |
| `AzureBlobStorage` | Production | `STORAGE_DRIVER=azure`, `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER` |

### Upload flow

1. Client calls `POST /api/attachments/upload` with filename + content type.
2. Server validates session and returns a signed upload destination (SAS URL for Azure, local path for disk).
3. Client uploads the file directly.
4. Server creates the `Attachment` row.

### Download flow

`GET /api/attachments/[id]` — server validates session + entity ownership, then streams the file or redirects to a time-limited signed URL.

---

## Calendar

- **Route:** `/calendar`
- **Component:** `components/calendar/calendar-view.tsx`
- Powered by **FullCalendar** with dayGrid, timeGrid, and interaction plugins.

Events are rendered over their `[liveStart, liveEnd]` span and color-coded by status:

| Status | Color |
|---|---|
| DRAFT | Grey |
| CONFIRMED | Blue |
| FUNCTION_SHEET_SENT | Purple |
| IN_SETUP | Orange |
| LIVE | Green |
| CLOSED | Red |
| ARCHIVED | Dark grey |

VIP events have a thick red border. Click any event to navigate to its function sheet. Filter chips allow filtering by department, coordinator, or status.

---

## Audit Log

Every mutating server action calls `lib/audit.ts:logAudit()`. The log is **append-only** — rows are never updated or deleted.

### Logged actions

- **Event:** create, update, status change, send function sheet
- **Agenda:** create, update, delete
- **Requirement:** create, update, delete
- **Assignment:** assign, unassign
- **Note:** create
- **Attachment:** upload, delete
- **User:** create, update, password reset, login

### Viewing the log

| Location | Access | Scope |
|---|---|---|
| `/admin/audit` | Admin only | All events grouped by event; system entries on page 1 |
| `/events/[id]/audit` | Admin + assigned Coordinator | Single event only |

Each entry shows: timestamp, actor name, action type, entity type/ID, and a before/after diff for updates.

---

## API Routes & Cron

| Path | Method | Purpose | Auth required |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Auth.js handler (sign in, sign out, session) | — |
| `/api/attachments/upload` | POST | Issue signed upload destination | Session |
| `/api/attachments/[id]` | GET | Authenticated file download | Session |
| `/api/cron/digest` | GET | Send batched edit-after-send digest emails | Bearer `CRON_SECRET` |
| `/events/[id]/pdf` | GET | Stream PDF of function sheet | Session |

---

## Deployment (Vercel)

### Prerequisites

- GitHub repository with the project pushed
- [Vercel account](https://vercel.com) connected to GitHub
- [Neon](https://neon.tech) Postgres database
- [Resend](https://resend.com) account with a verified sending domain

### Steps

**1. Push to GitHub**

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

**2. Import in Vercel**

Go to vercel.com → New Project → select your GitHub repo. Framework preset auto-detects as Next.js. The build command `prisma generate && next build` is already configured in `package.json`.

**3. Set environment variables in Vercel dashboard**

Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon production connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `MAIL_DRIVER` | `resend` |
| `RESEND_API_KEY` | Your Resend API key |
| `EMAIL_FROM` | Verified sender address (e.g. `noreply@bic.com.bh`) |
| `STORAGE_DRIVER` | `azure` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob connection string |
| `AZURE_STORAGE_CONTAINER` | `attachments` |
| `APP_URL` | Your Vercel URL (e.g. `https://bic-function-sheet.vercel.app`) |
| `CRON_SECRET` | Random secret string |

**4. Deploy**

Vercel builds and deploys automatically on every push to `main`.

**5. Run migration on first deploy**

```bash
npx prisma migrate deploy
npx prisma db seed
```

**6. Cron job**

`vercel.json` schedules the digest cron at midnight UTC:

```json
{ "crons": [{ "path": "/api/cron/digest", "schedule": "0 0 * * *" }] }
```

Vercel calls this endpoint automatically. `CRON_SECRET` must be set to validate requests.

---

## Enabling Microsoft 365 SSO

The M365 / Entra ID provider is fully implemented in `lib/auth.ts` but disabled by default. Activate it after validating the app with email/password login.

### 1. Register an app in Azure Entra ID

- Azure Portal → Entra ID → App registrations → New registration
- Name: `BIC Function Sheet`
- Redirect URI: `https://<your-app-url>/api/auth/callback/microsoft-entra-id`
- Note the **Application (client) ID** and **Directory (tenant) ID**
- Under Certificates & secrets → New client secret, create a secret and note the value

### 2. Set environment variables

```env
AUTH_M365_ENABLED="true"
NEXT_PUBLIC_AUTH_M365_ENABLED="true"
AUTH_MICROSOFT_ENTRA_ID_ID="<client-id>"
AUTH_MICROSOFT_ENTRA_ID_SECRET="<client-secret>"
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<tenant-id>/v2.0"
```

### 3. What happens on first SSO sign-in

- If a user with the same email already exists (created via email/password), their `azureOid` is populated and the accounts are linked automatically.
- If no matching email exists, a new account is created.
- The "Sign in with Microsoft" button appears on `/signin` when `NEXT_PUBLIC_AUTH_M365_ENABLED=true`.

### 4. Rollback

Set both env vars back to `false` and redeploy. Existing `azureOid` values are preserved but unused.

---

## Seeded Departments

The following 18 departments are created by `prisma/seed.ts`:

| # | Department |
|---|---|
| 1 | Events & Hospitality |
| 2 | Catering & F&B |
| 3 | Security |
| 4 | Logistics & Transport |
| 5 | IT & Technology |
| 6 | Marketing & Communications |
| 7 | Finance |
| 8 | Human Resources |
| 9 | Health, Safety & Environment |
| 10 | Operations & Facilities |
| 11 | Ticketing |
| 12 | Media & Broadcast |
| 13 | Protocol & VIP Services |
| 14 | Medical Services |
| 15 | Cleaning & Waste Management |
| 16 | Decoration & Branding |
| 17 | Parking & Traffic Management |
| 18 | Supplier |

---

## Development Notes

### Timezone

All timestamps are stored in UTC. The UI renders times in **Asia/Bahrain (UTC+3)** using `date-fns-tz`.

### Edit-after-send tracking

Once a function sheet is sent (`functionSheetSentAt` is set), any further edits to the event, agenda, or requirements automatically:

1. Write a `FUNCTION_SHEET_UPDATED` notification row for each dept manager on the event.
2. Update `Event.lastEditedAfterSendAt`.
3. The daily cron batches these into one digest email per manager per event.

### Manager-only notes

`RequirementNote` rows are visible only to the note author (dept manager), the event coordinator, and admins. They never appear in team member or other managers' views.

### Security notes

- All server actions validate the session and call policy predicates from `lib/authz.ts` before any database mutation.
- Access control is enforced at the application layer — no Postgres row-level security.
- File downloads require a valid session and entity ownership verification.
- The digest cron endpoint requires `Authorization: Bearer <CRON_SECRET>`.
