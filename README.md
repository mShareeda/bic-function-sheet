# BIC Function Sheet

Internal event coordination platform for **Bahrain International Circuit (BIC)**. Coordinators create structured function sheets that distribute event requirements across departments, ensuring every team has the information they need before race day.

## Overview

A function sheet is a formal event brief shared across departments (F&B, Safety, ICT, Marketing, Operations, etc.). This platform replaces manual spreadsheets and email chains with a centralized, role-aware workflow — from initial draft through departmental sign-off and PDF distribution.

## Features

- **Role-based access** — Admin, Coordinator, Department Manager, Team Member
- **Event lifecycle management** — Draft → Review → Approved → Distributed → Completed
- **Department requirements tracking** — per-department sections with status indicators
- **PDF export** — print-ready function sheets for on-site distribution
- **Calendar view** — upcoming events at a glance
- **File attachments** — supporting documents per event or department section
- **Email notifications** — automatic alerts on status changes and assignments
- **Audit log** — full history of changes per event
- **Azure SSO ready** — enterprise sign-in via Azure Active Directory

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma |
| Auth | NextAuth v5 |
| Styling | Tailwind CSS + Radix UI |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- (Optional) Azure AD app registration for SSO

### Installation

```bash
# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env.local

# Push the database schema
npx prisma db push

# Seed initial data (roles, departments)
npx prisma db seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session signing |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `AZURE_AD_CLIENT_ID` | Azure AD app client ID (SSO) |
| `AZURE_AD_CLIENT_SECRET` | Azure AD app client secret (SSO) |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID (SSO) |
| `RESEND_API_KEY` | Resend API key for email notifications |
| `NEXT_PUBLIC_APP_URL` | Public app URL for link generation |

## Project Structure

```
app/                  # Next.js App Router pages and API routes
components/           # Shared UI components
lib/                  # Prisma client, auth config, utilities
prisma/               # Schema and seed scripts
public/               # Static assets
```

## Roles

| Role | Capabilities |
|---|---|
| **Admin** | Full access: manage users, departments, all events |
| **Coordinator** | Create and manage function sheets, assign departments |
| **Department Manager** | View assigned sections, update department status |
| **Team Member** | View function sheets relevant to their department |

## License

Private — internal use at Bahrain International Circuit only.
