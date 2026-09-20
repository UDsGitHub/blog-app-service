jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import { PrismaService } from '../prisma.service';
import { ArticleStatus } from '../generated/prisma/client';

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

  it('creates an article with a unique slug', async () => {
    const title = 'My First Article';
    const body = 'Hello World';
    const slug = 'my-first-article';
    const expectedReturnValue = {
      id: '1',
      title,
      slug,
      body,
      createdAt: Date.now(),
    };

    prisma.article.count.mockResolvedValue(0);
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

  it('creates an article with unique slug if title slug collides', async () => {
    const title = 'My First Article';
    const body = 'Hello World';
    const slug = 'my-first-article-1';
    const expectedReturnValue = {
      id: '2',
      title,
      slug,
      body,
      createdAt: Date.now(),
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

  it('returns all articles', async () => {
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
    const expected = {
      data: expectedArticles,
      hasMore: false,
    };
    prisma.article.findMany.mockResolvedValue(expectedArticles);

    const returnValue = await service.findAll(25);

    expect(returnValue).toEqual(expected);
    expect(returnValue.data).toHaveLength(2);
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

    prisma.article.delete.mockResolvedValue(expectedReturnValue);

    const returnValue = await service.remove('2');

    expect(prisma.article.delete).toHaveBeenCalledWith({
      where: { id: '2' },
    });
    expect(returnValue).toBe(expectedReturnValue);
  });
});
