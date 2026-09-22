-- AlterTable
ALTER TABLE "article" ADD COLUMN     "excerpt" VARCHAR(300) DEFAULT '',
ADD COLUMN     "published_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "article_slug_history" (
    "article_id" UUID NOT NULL,
    "slug" VARCHAR(255) NOT NULL,

    CONSTRAINT "article_slug_history_pkey" PRIMARY KEY ("article_id","slug")
);

-- CreateIndex
CREATE UNIQUE INDEX "article_slug_history_slug_key" ON "article_slug_history"("slug");

-- AddForeignKey
ALTER TABLE "article_slug_history" ADD CONSTRAINT "article_slug_history_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
