DO $$
BEGIN
  CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ContactEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ContactMessageStatus" AS ENUM ('OPEN', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN IF NOT EXISTS "googleId" TEXT;

ALTER TABLE "User"
  ALTER COLUMN "password" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

ALTER TABLE "ContactMessage"
  ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE "ContactMessage"
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "emailStatus" "ContactEmailStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "errorMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "notifiedAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "status" "ContactMessageStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ContactMessage"
SET "subject" = COALESCE(NULLIF(BTRIM("subject"), ''), 'General Inquiry');

UPDATE "ContactMessage"
SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);

ALTER TABLE "ContactMessage"
  ALTER COLUMN "subject" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "ContactMessage_emailStatus_createdAt_idx"
  ON "ContactMessage"("emailStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx"
  ON "ContactMessage"("status", "createdAt");
