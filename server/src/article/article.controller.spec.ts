jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';

describe('ArticleController', () => {
  let controller: ArticleController;
  const appService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findBySlug: jest.fn(),
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

  it('calls app.service.create()', async () => {
    const requestData = { title: 'title', body: 'body' };
    await controller.createArticle(requestData);
    expect(appService.create).toHaveBeenCalledWith(requestData);
  });

  it('calls app.service.findAll()', async () => {
    await controller.findArticles({ limit: 25 });
    expect(appService.findAll).toHaveBeenCalledWith(25, undefined, undefined);
  });

  it('calls app.service.findAll() with pagination args', async () => {
    const cursorId = crypto.randomUUID();
    await controller.findArticles({ cursorId, limit: 25 });
    expect(appService.findAll).toHaveBeenCalledWith(25, cursorId, undefined);
  });

  it('calls app.service.findBySlug()', async () => {
    await controller.findArticle('title');
    expect(appService.findBySlug).toHaveBeenCalledWith('title');
  });

  it('calls app.service.update()', async () => {
    const requestData = { title: 'title' };
    await controller.updateArticle('1', requestData);
    expect(appService.update).toHaveBeenCalledWith('1', requestData);
  });

  it('calls app.service.delete()', async () => {
    await controller.removeArticle('1');
    expect(appService.remove).toHaveBeenCalledWith('1');
  });
});
