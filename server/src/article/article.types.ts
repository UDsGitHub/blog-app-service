import { Article } from '../generated/prisma/client';

export type ArticlePreview = Omit<Article, 'body'>;
