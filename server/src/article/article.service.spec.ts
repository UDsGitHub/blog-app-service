jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import { PrismaService } from '../prisma.service';
import { ArticleStatus } from '../generated/prisma/client';
import { InternalServerErrorException } from '@nestjs/common';

describe('ArticleService', () => {
  let service: ArticleService;
  const prisma = {
    article: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    articleSlugHistory: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  describe('default flow', () => {
    it('creates an article', async () => {
      const title = 'My First Article';
      const body = 'Hello World';
      const excerpt = 'Hello World';
      const slug = 'my-first-article';
      const expectedReturnValue = {
        id: '1',
        title,
        slug,
        body,
        excerpt,
        createdAt: Date.now(),
      };

      prisma.article.count.mockResolvedValue(0);
      prisma.article.create.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.create({
        title,
        body: 'Hello World',
        excerpt: 'Hello World',
        status: ArticleStatus.DRAFT,
      });

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: {
          title,
          slug,
          body,
          excerpt,
          status: ArticleStatus.DRAFT,
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
    });

    it('creates an article with unique slug if title slug collides', async () => {
      const title = 'My First Article';
      const body = 'Hello World';
      const slug = 'my-first-article-1';
      const expectedReturnValue = {
        id: '2',
        title,
        slug,
        body,
      };

      prisma.article.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      prisma.article.create.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.create({
        title,
        body: 'Hello World',
        status: ArticleStatus.DRAFT,
      });

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: {
          title,
          slug,
          body,
          status: ArticleStatus.DRAFT,
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
    });

    it('creates an article with status PUBLISHED', async () => {
      const title = 'My First Article';
      const body = 'Hello World';
      const slug = 'my-first-article';
      const status = ArticleStatus.PUBLISHED;
      const expectedReturnValue = {
        id: '1',
        title,
        slug,
        body,
        status,
      };

      prisma.article.count.mockResolvedValue(0);
      prisma.article.create.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.create({
        title,
        body: 'Hello World',
        status,
      });

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: {
          title,
          slug,
          body,
          status,
          publishedAt: expect.any(Date) as Date,
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
    });

    it('creates new slug history entry if article is published and title is changed', async () => {
      const articleId = '1';
      const articleSlug = 'slug';

      prisma.article.findUnique.mockResolvedValue({
        id: articleId,
        title: 'title',
        slug: articleSlug,
        body: 'hello',
        status: ArticleStatus.PUBLISHED,
      });

      await service.update(articleId, { title: 'new title' });

      expect(prisma.articleSlugHistory.create).toHaveBeenCalledWith({
        data: {
          articleId,
          slug: articleSlug,
        },
      });
    });

    it('falls back to slug history article id if not found in article table', async () => {
      const articleSlug = 'slug';

      prisma.article.findUnique.mockResolvedValueOnce(null);
      prisma.article.findUnique.mockResolvedValueOnce({
        id: 'id',
        title: 'title',
        slug: 'other-slug',
        body: 'hello',
        status: ArticleStatus.PUBLISHED,
      });
      prisma.articleSlugHistory.findUnique.mockResolvedValue({
        articleId: 'id',
      });

      await service.findBySlug(articleSlug);

      expect(prisma.articleSlugHistory.findUnique).toHaveBeenCalledWith({
        where: {
          slug: articleSlug,
        },
        select: {
          articleId: true,
        },
      });
    });

    it('returns all articles - no filters', async () => {
      const expectedArticles = [
        {
          id: '1',
          title: 'title',
          slug: 'title',
          status: ArticleStatus.DRAFT,
          excerpt: 'body',
          body: 'body',
          createdAt: new Date(),
        },
        {
          id: '2',
          title: 'title',
          slug: 'title-1',
          status: ArticleStatus.DRAFT,
          excerpt: '',
          body: 'body',
          createdAt: new Date(),
        },
      ];
      prisma.article.findMany.mockResolvedValue(expectedArticles);

      const response = await service.browse(25);

      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25 + 1,
      });
      expect(response.data[0]).toEqual({
        id: expectedArticles[0].id,
        title: expectedArticles[0].title,
        slug: expectedArticles[0].slug,
        status: expectedArticles[0].status,
        excerpt: expectedArticles[0].excerpt,
        createdAt: expectedArticles[0].createdAt,
      });
      expect(response.data[1]).toEqual({
        id: expectedArticles[1].id,
        title: expectedArticles[1].title,
        slug: expectedArticles[1].slug,
        status: expectedArticles[1].status,
        excerpt: expectedArticles[1].body,
        createdAt: expectedArticles[1].createdAt,
      });
    });

    it('returns all articles - filters: [cursorId]', async () => {
      const expectedArticles = [
        {
          id: '1',
          title: 'title',
          slug: 'title',
          body: 'body',
          createdAt: 1788970361746,
        },
        {
          id: '2',
          title: 'title',
          slug: 'title-1',
          body: 'body',
          createdAt: 1788970361747,
        },
      ];
      prisma.article.findMany.mockResolvedValue(expectedArticles);

      await service.browse(25, 'uuid');

      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25 + 1,
        cursor: { id: 'uuid' },
        skip: 1,
      });
    });

    it('returns all articles - filters: [cursorId, status<DRAFT>]', async () => {
      const expectedArticles = [
        {
          id: '1',
          title: 'title',
          slug: 'title',
          body: 'body',
          createdAt: 1788970361746,
        },
        {
          id: '2',
          title: 'title',
          slug: 'title-1',
          body: 'body',
          createdAt: 1788970361747,
        },
      ];
      prisma.article.findMany.mockResolvedValue(expectedArticles);

      await service.browse(25, 'uuid', ArticleStatus.DRAFT);

      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: { status: ArticleStatus.DRAFT },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25 + 1,
        cursor: { id: 'uuid' },
        skip: 1,
      });
    });

    it('returns all articles - filters: [cursorId, status<PUBLISHED>, startDate]', async () => {
      const expectedArticles = [
        {
          id: '1',
          title: 'title',
          slug: 'title',
          excerpt: '',
          createdAt: 1788970361746,
        },
        {
          id: '2',
          title: 'title',
          slug: 'title-1',
          excerpt: '',
          createdAt: 1788970361747,
        },
      ];
      const expected = {
        data: expectedArticles,
        hasMore: false,
      };
      prisma.article.findMany.mockResolvedValue(expectedArticles);

      const startDate = new Date();
      const returnValue = await service.browse(
        25,
        'uuid',
        ArticleStatus.PUBLISHED,
        startDate,
      );

      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {
          status: ArticleStatus.PUBLISHED,
          publishedAt: { gte: startDate },
        },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 25 + 1,
        cursor: { id: 'uuid' },
        skip: 1,
      });
      expect(returnValue).toEqual(expected);
      expect(returnValue.data).toHaveLength(2);
    });

    it('returns all articles - filters: [cursorId, status<PUBLISHED>, startDate, endDate]', async () => {
      const expectedArticles = [
        {
          id: '1',
          title: 'title',
          slug: 'title',
          excerpt: '',
          createdAt: 1788970361746,
        },
        {
          id: '2',
          title: 'title',
          slug: 'title-1',
          excerpt: '',
          createdAt: 1788970361747,
        },
      ];
      const expected = {
        data: expectedArticles,
        hasMore: false,
      };
      prisma.article.findMany.mockResolvedValue(expectedArticles);

      const startDate = new Date('2026-09-19');
      const endDate = new Date('2026-09-20');
      const returnValue = await service.browse(
        25,
        'uuid',
        ArticleStatus.PUBLISHED,
        startDate,
        endDate,
      );

      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {
          status: ArticleStatus.PUBLISHED,
          publishedAt: { gte: startDate, lte: endDate },
        },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 25 + 1,
        cursor: { id: 'uuid' },
        skip: 1,
      });
      expect(returnValue).toEqual(expected);
      expect(returnValue.data).toHaveLength(2);
    });

    it('derives excerpt for article body', async () => {
      const expectedArticles = [
        {
          id: '1',
          title: 'title',
          slug: 'title',
          status: ArticleStatus.DRAFT,
          body: '# Hello\n\nworld',
          excerpt: '',
          createdAt: 1788970361746,
        },
        {
          id: '2',
          title: 'title',
          slug: 'title-1',
          status: ArticleStatus.DRAFT,
          body: '## Lorem ipsum dolor sit amet\n\n consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec.',
          excerpt: '',
          createdAt: 1788970361747,
        },
      ];
      prisma.article.findMany.mockResolvedValue(expectedArticles);

      const response = await service.browse(25);

      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25 + 1,
      });
      expect(response.data[0].id).toBe(expectedArticles[0].id);
      expect(response.data[0].excerpt).toBe('Hello world');
      expect(response.data[1].id).toBe(expectedArticles[1].id);
      expect(response.data[1].excerpt!.length).toBeLessThanOrEqual(163);
      expect(/(\w+)\.\.\.$/.test(response.data[1].excerpt ?? '')).toBe(true);
    });

    it('returns article by slug', async () => {
      const expectedReturnValue = {
        id: '2',
        title: 'title',
        slug: 'title',
        body: 'body',
        createdAt: 1788970361747,
      };

      prisma.article.findUnique.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.findBySlug('title');

      expect(prisma.article.findUnique).toHaveBeenCalledWith({
        where: {
          slug: 'title',
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
    });

    it('updates title and slug', async () => {
      const createdAt = new Date('2026-09-15');
      const updatedAt = new Date('2026-09-16');
      const expectedReturnValue = {
        id: '2',
        title: 'title-2',
        slug: 'title-2',
        body: 'body',
        createdAt,
        updatedAt,
      };

      prisma.article.count.mockResolvedValueOnce(0);
      prisma.article.findUnique.mockResolvedValue({
        id: '2',
        title: 'title-1',
        slug: 'title-1',
        body: 'body',
        createdAt,
      });
      prisma.article.update.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.update('2', { title: 'title-2' });

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: {
          title: 'title-2',
          slug: 'title-2',
          updatedAt: expect.any(Date) as Date,
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
      expect(returnValue.slug).toBe('title-2');
    });

    it('updates article body only', async () => {
      const createdAt = new Date('2026-09-15');
      const updatedAt = new Date('2026-09-16');
      const expectedReturnValue = {
        id: '2',
        title: 'title',
        slug: 'title',
        body: 'not body',
        createdAt,
        updatedAt,
      };

      prisma.article.count.mockResolvedValueOnce(0);
      prisma.article.findUnique.mockResolvedValue({
        id: '2',
        title: 'title',
        slug: 'title',
        body: 'body',
        createdAt,
      });
      prisma.article.update.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.update('2', { body: 'not body' });

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: { body: 'not body', updatedAt: expect.any(Date) as Date },
      });
      expect(returnValue).toBe(expectedReturnValue);
      expect(returnValue.slug).toBe('title');
    });

    it('deletes article by id', async () => {
      const expectedReturnValue = {
        id: '2',
        title: 'title-2',
        slug: 'title-2',
        body: 'body',
        createdAt: new Date(),
      };

      prisma.article.findUnique.mockResolvedValue(expectedReturnValue);
      prisma.article.delete.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.remove('2');

      expect(prisma.article.delete).toHaveBeenCalledWith({
        where: { id: '2' },
      });
      expect(returnValue).toBe(expectedReturnValue);
    });
  });

  describe('edge cases', () => {
    it('throws error if updating article status from DRAFT to ARCHIVED', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.DRAFT,
      });

      await expect(
        service.update(crypto.randomUUID(), {
          status: ArticleStatus.ARCHIVED,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(prisma.article.update).not.toHaveBeenCalled();
    });

    it('throws error if updating article status from PUBLISHED to DRAFT', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.PUBLISHED,
      });

      await expect(
        service.update(crypto.randomUUID(), {
          status: ArticleStatus.DRAFT,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(prisma.article.update).not.toHaveBeenCalled();
    });
  });
});
