-- Add ssoProvisionedAt column to track JIT SSO users awaiting admin approval
ALTER TABLE "User" ADD COLUMN "ssoProvisionedAt" TIMESTAMP(3);

-- Add SSO_PENDING_APPROVAL to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SSO_PENDING_APPROVAL';
