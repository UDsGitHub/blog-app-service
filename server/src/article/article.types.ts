import { Article } from '../generated/prisma/client';

export type ArticlePreview = Omit<Article, 'body'>;
export type ArticleSearchPreview = Omit<Article, 'body' | 'excerpt'> & {
  headline: string;
};
