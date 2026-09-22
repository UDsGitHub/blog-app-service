jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { ArticleStatus } from '../generated/prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('ArticleController', () => {
  let controller: ArticleController;
  const appService = {
    create: jest.fn(),
    browse: jest.fn(),
    search: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [
        {
          provide: ArticleService,
          useValue: appService,
        },
      ],
    }).compile();

    controller = module.get<ArticleController>(ArticleController);
  });

  describe('default flow', () => {
    it('calls app.service.create()', async () => {
      const requestData = {
        title: 'title',
        body: 'body',
        status: ArticleStatus.DRAFT,
      };
      await controller.createArticle(requestData);
      expect(appService.create).toHaveBeenCalledWith(requestData);
    });

    it('calls app.service.browse()', async () => {
      await controller.browseArticles({ limit: 25 });
      expect(appService.browse).toHaveBeenCalledWith(
        25,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('calls app.service.search()', async () => {
      await controller.searchArticles({ search: 'search', limit: 25 });
      expect(appService.search).toHaveBeenCalledWith(
        25,
        'search',
        undefined,
        undefined,
        undefined,
      );
    });

    it('calls app.service.findAll() with pagination args', async () => {
      const cursorId = crypto.randomUUID();
      const expected = {
        data: [{ id: '1', title: 'title' }],
        hasMore: false,
      };
      appService.browse.mockResolvedValue(expected);
      const response = await controller.browseArticles({ cursorId, limit: 25 });
      expect(appService.browse).toHaveBeenCalledWith(
        25,
        cursorId,
        undefined,
        undefined,
        undefined,
      );
      expect(response).toEqual(expected);
    });

    it('calls app.service.findBySlug()', async () => {
      await controller.findBySlug('slug');
      expect(appService.findBySlug).toHaveBeenCalledWith('slug');
    });

    it('calls app.service.findById()', async () => {
      await controller.findById('uuid');
      expect(appService.findById).toHaveBeenCalledWith('uuid');
    });

    it('calls app.service.update()', async () => {
      const requestData = { title: 'title', status: ArticleStatus.ARCHIVED };
      await controller.updateArticle('1', requestData);
      expect(appService.update).toHaveBeenCalledWith('1', requestData);
    });

    it('calls app.service.delete()', async () => {
      await controller.removeArticle('1');
      expect(appService.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('edge cases', () => {
    it('throws error creating article with status ARCHIVED', async () => {
      await expect(
        controller.createArticle({
          title: 'title',
          body: 'body',
          status: ArticleStatus.ARCHIVED,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(appService.create).not.toHaveBeenCalled();
    });
  });
});
