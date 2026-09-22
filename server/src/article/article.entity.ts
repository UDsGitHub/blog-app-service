import { Article, ArticleStatus } from '../generated/prisma/client';
import { ArticlePreview, ArticleSearchPreview } from './article.types';
import { IsEnum } from 'class-validator';

export class ArticleEntity implements Article {
  id!: string;
  title!: string;
  slug!: string;
  body!: string;
  status!: ArticleStatus;
  excerpt: string | null = null;
  createdAt!: Date;
  updatedAt: Date | null = null;
  publishedAt: Date | null = null;
}

export class ArticlePreviewEntity implements ArticlePreview {
  id!: string;
  title!: string;
  slug!: string;
  @IsEnum(ArticleStatus)
  status!: ArticleStatus;
  excerpt: string | null = null;
  createdAt!: Date;
  updatedAt: Date | null = null;
  publishedAt: Date | null = null;
}

export class ArticleSearchPreviewEntity implements ArticleSearchPreview {
  title!: string;
  id!: string;
  slug!: string;
  @IsEnum(ArticleStatus)
  status!: ArticleStatus;
  createdAt!: Date;
  updatedAt: Date | null = null;
  publishedAt: Date | null = null;
  headline!: string;
}
