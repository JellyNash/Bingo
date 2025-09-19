-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "sessionToken" TEXT,
ALTER COLUMN "resumeToken" DROP NOT NULL,
ALTER COLUMN "resumeToken" SET DATA TYPE TEXT;
