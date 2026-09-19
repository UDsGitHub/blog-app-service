-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "article" ADD COLUMN     "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT';
