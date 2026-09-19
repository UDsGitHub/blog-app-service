import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { Article } from '../src/article/entities/article.entity';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterEach(async () => {
    await prisma.article.deleteMany();
    await app.close();
    await prisma.$disconnect();
  });

  describe('happy path works', () => {
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
      expect(createdArticle.status).toEqual('DRAFT');

      const getArticlesRes = await request(app.getHttpServer())
        .get(`/articles/${createdArticle.slug}`)
        .expect(200);
      expect(getArticlesRes.body as Article).toMatchObject(createdArticle);

      const expectedTitle = 'updated first article';
      const expectedSlug = 'updated-first-article';
      const updateArticleRes = await request(app.getHttpServer())
        .patch(`/articles/${createdArticle.id}`)
        .send({ title: expectedTitle, status: 'PUBLISHED' })
        .expect(200);
      const updatedArticle = updateArticleRes.body as Article;
      expect(updatedArticle.body).toEqual(createdArticle.body);
      expect(updatedArticle.title).toEqual(expectedTitle);
      expect(updatedArticle.slug).toEqual(expectedSlug);
      expect(updatedArticle.status).toEqual('PUBLISHED');

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
      const [secondArticle, firstArticle] = getArticlesRes.body as Article[];
      expect(firstArticle).toEqual(article1);
      expect(secondArticle).toEqual(article2);
      expect(firstArticle.slug).not.toBe(secondArticle.slug);
    });

    it('fetches paginated articles no search term', async () => {
      await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'first article',
          body: 'hello world',
        })
        .expect(201);
      const second = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'second article',
          body: 'hello world',
        })
        .expect(201);
      const third = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'third article',
          body: 'hello world',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'fourth article',
          body: 'hello world',
        })
        .expect(201);

      const article2 = second.body as Article;
      const article3 = third.body as Article;

      const getArticlesRes = await request(app.getHttpServer())
        .get(`/articles?cursorId=${article3.id}&limit=3`)
        .expect(200);
      const articles = getArticlesRes.body as Article[];
      expect(articles).toHaveLength(2);
      expect(articles[0].id).toBe(article2.id);
    });

    it('fetches next page of paginated articles no search term', async () => {
      const first = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'first article',
          body: 'hello world',
        })
        .expect(201);
      const second = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'second article',
          body: 'hello world',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'third article',
          body: 'hello world',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'fourth article',
          body: 'hello world',
        })
        .expect(201);

      const article1 = first.body as Article;
      const article2 = second.body as Article;

      const getArticlesRes = await request(app.getHttpServer())
        .get(`/articles?cursorId=${article2.id}&limit=3`)
        .expect(200);
      const articles = getArticlesRes.body as Article[];
      expect(articles).toHaveLength(1);
      expect(articles[0].id).toBe(article1.id);
    });

    it('fetches articles with search term', async () => {
      const searchTerm = 'article 1';
      await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'first article',
          body: 'hello world',
        })
        .expect(201);
      const second = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: `second article`,
          body: `hello world ${searchTerm}`,
        })
        .expect(201);
      const third = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'third article',
          body: `hello world ${searchTerm}`,
        })
        .expect(201);
      const article2 = second.body as Article;
      const article3 = third.body as Article;

      const getArticlesRes = await request(app.getHttpServer())
        .get(`/articles?search=${encodeURIComponent(searchTerm)}&limit=3`)
        .expect(200);
      const articles = getArticlesRes.body as Article[];
      expect(articles).toHaveLength(2);
      expect(articles[1].id).toBe(article2.id);
      expect(articles[1].body.includes(searchTerm)).toBe(true);
      expect(articles[0].id).toBe(article3.id);
      expect(articles[0].body.includes(searchTerm)).toBe(true);
    });
  });

  describe('fails as needed', () => {
    it('get articles throws 400 on bad request', async () => {
      await request(app.getHttpServer())
        .get('/articles?cursorId=1&limit=10')
        .expect(400);
      await request(app.getHttpServer())
        .get('/articles?cursorId=1&limit=string')
        .expect(400);
      await request(app.getHttpServer())
        .get(`/articles?cursorId=${crypto.randomUUID()}&limit=string`)
        .expect(400);
      await request(app.getHttpServer())
        .get(`/articles?cursorId=${crypto.randomUUID()}&limit=3&search=frog`)
        .expect(400);
    });

    it('create article throws 400 error on bad request', async () => {
      await request(app.getHttpServer()).post('/articles').send().expect(400);
      await request(app.getHttpServer())
        .post('/articles')
        .send({ title: 'hello' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/articles')
        .send({ body: 'goodbye' })
        .expect(400);
    });

    it('update article throws 400 error on bad request', async () => {
      const randomId = crypto.randomUUID();
      await request(app.getHttpServer()).patch('/articles/1').expect(400);
      await request(app.getHttpServer())
        .patch(`/articles/${randomId}`)
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/articles/${randomId}`)
        .send({ title: 'gone' })
        .expect(404);
      const response = await request(app.getHttpServer())
        .post('/articles')
        .send({ title: 'hello', body: 'world' })
        .expect(201);
      const createdArticle = response.body as Article;
      await request(app.getHttpServer())
        .patch(`/articles/${createdArticle.id}`)
        .send({ status: 'BAD_STATUS' })
        .expect(400);
    });

    it('delete article throws 400 error on bad request', async () => {
      await request(app.getHttpServer()).delete('/articles/1').expect(400);
    });
  });
});
