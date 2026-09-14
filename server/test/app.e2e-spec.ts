import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { Article } from '../src/entities/article.entity';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterEach(async () => {
    await prisma.article.deleteMany();
    await app.close();
    await prisma.$disconnect();
  });

  it('default article CRUD flow', async () => {
    const expectedData = {
      title: 'first article',
      body: 'hello world',
    };

    const createRes = await request(app.getHttpServer())
      .post('/articles')
      .send(expectedData)
      .expect(201);

    const createdArticle = createRes.body as Article;
    expect({
      title: createdArticle.title,
      body: createdArticle.body,
    }).toMatchObject(expectedData);
    expect(createdArticle.slug).toEqual('first-article');

    const getArticlesRes = await request(app.getHttpServer())
      .get(`/articles/${createdArticle.slug}`)
      .expect(200);
    expect(getArticlesRes.body as Article).toMatchObject(createdArticle);

    const expectedTitle = 'updated first article';
    const expectedSlug = 'updated-first-article';
    const updateArticleRes = await request(app.getHttpServer())
      .patch(`/articles/${createdArticle.id}`)
      .send({ title: expectedTitle })
      .expect(200);
    const updatedArticle = updateArticleRes.body as Article;
    expect(updatedArticle.title).toEqual(expectedTitle);
    expect(updatedArticle.body).toEqual(createdArticle.body);
    expect(updatedArticle.slug).toEqual(expectedSlug);

    await request(app.getHttpServer())
      .delete(`/articles/${createdArticle.id}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/articles')
      .expect(200);
    const articles = response.body as Article[];
    expect(articles).toHaveLength(0);
  });

  it('creates unique slug if title is duplicate', async () => {
    const first = await request(app.getHttpServer())
      .post('/articles')
      .send({
        title: 'first article',
        body: 'hello world',
      })
      .expect(201);
    const article1 = first.body as Article;
    const second = await request(app.getHttpServer())
      .post('/articles')
      .send({
        title: 'first article',
        body: 'hello world',
      })
      .expect(201);
    const article2 = second.body as Article;

    const getArticlesRes = await request(app.getHttpServer())
      .get(`/articles`)
      .expect(200);
    const [firstArticle, secondArticle] = getArticlesRes.body as Article[];
    expect(firstArticle).toEqual(article1);
    expect(secondArticle).toEqual(article2);
    expect(firstArticle.slug).not.toBe(secondArticle.slug);
  });
});
