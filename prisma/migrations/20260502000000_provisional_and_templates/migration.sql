-- ── Migration: provisional function sheet status + event templates ────────────

-- 1. Add PROVISIONAL_FUNCTION_SHEET_SENT to the EventStatus enum.
--    PostgreSQL requires ADD VALUE to run outside a transaction.
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'PROVISIONAL_FUNCTION_SHEET_SENT' AFTER 'CONFIRMED';

-- 2. Create EventTemplate table for recurring-event scaffolds.
CREATE TABLE IF NOT EXISTS "EventTemplate" (
    "id"              TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "description"     TEXT,
    "eventType"       TEXT,
    "isVip"           BOOLEAN NOT NULL DEFAULT false,
    "estimatedGuests" INTEGER,
    "salespersonName" TEXT,
    "departments"     JSONB NOT NULL DEFAULT '[]',
    "agendaItems"     JSONB NOT NULL DEFAULT '[]',
    "createdById"     TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- 3. Foreign key: EventTemplate → User
ALTER TABLE "EventTemplate"
    ADD CONSTRAINT "EventTemplate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Index for listing templates by creator
CREATE INDEX IF NOT EXISTS "EventTemplate_createdById_idx" ON "EventTemplate"("createdById");
