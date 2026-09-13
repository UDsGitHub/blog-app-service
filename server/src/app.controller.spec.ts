jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));
jest.mock('./prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  const appService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('calls app.service.create()', async () => {
    const requestData = { title: 'title', body: 'body' };
    await controller.createArticle(requestData);
    expect(appService.create).toHaveBeenCalledWith(requestData);
  });

  it('calls app.service.findAll()', async () => {
    await controller.findArticles();
    expect(appService.findAll).toHaveBeenCalled();
  });

  it('calls app.service.findOne()', async () => {
    await controller.findArticle('title');
    expect(appService.findOne).toHaveBeenCalledWith('title');
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
