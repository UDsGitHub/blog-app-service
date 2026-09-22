import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { BrowseArticlesResponseDto } from '../src/article/dto/browse-articles.dto';
import { Article, ArticleStatus } from '../src/generated/prisma/client';
import { SearchArticlesResponseDto } from '../src/article/dto/search-articles.dto';

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

  describe('default flow', () => {
    it('default article CRUD flow', async () => {
      const expectedData = {
        title: 'first article',
        body: 'hello world',
        status: ArticleStatus.DRAFT,
      };

      const createRes = await request(app.getHttpServer())
        .post('/articles')
        .send(expectedData)
        .expect(201);

      const createdArticle = createRes.body as Article;
      expect({
        title: createdArticle.title,
        body: createdArticle.body,
        status: ArticleStatus.DRAFT,
      }).toMatchObject(expectedData);
      expect(createdArticle.slug).toEqual('first-article');
      expect(createdArticle.status).toEqual('DRAFT');

      const getArticleBySlugRes = await request(app.getHttpServer())
        .get(`/articles/${createdArticle.slug}`)
        .expect(200);
      const getArticleByIdRes = await request(app.getHttpServer())
        .get(`/articles/id/${createdArticle.id}`)
        .expect(200);
      expect(getArticleBySlugRes.body as Article).toMatchObject(createdArticle);
      expect((getArticleBySlugRes.body as Article).id).toEqual(
        (getArticleByIdRes.body as Article).id,
      );

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
      expect(updatedArticle.updatedAt).toBeDefined();
      expect(updatedArticle.publishedAt).toBeDefined();
      expect(
        new Date(updatedArticle.updatedAt as unknown as string).getTime(),
      ).toBeGreaterThan(new Date(createdArticle.createdAt).getTime());

      await request(app.getHttpServer())
        .delete(`/articles/${createdArticle.id}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/articles?status=PUBLISHED')
        .expect(200);
      const articles = response.body as BrowseArticlesResponseDto;
      expect(articles.data).toHaveLength(0);
    });

    it('article created with PUBLISHED status should have publishedAt set', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'first article',
          body: 'hello world',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);

      const createdArticle = createRes.body as Article;

      expect({
        title: createdArticle.title,
        slug: createdArticle.slug,
        body: createdArticle.body,
        status: createdArticle.status,
      }).toMatchObject({
        title: 'first article',
        slug: 'first-article',
        body: 'hello world',
        status: ArticleStatus.PUBLISHED,
      });
      expect(createdArticle.publishedAt).toBeDefined();
    });

    describe('browse articles - no search term', () => {
      it('fetches articles', async () => {
        await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'first article',
            body: `
            ## Images

            ![Minion](https://octodex.github.com/images/minion.png)
            ![Stormtroopocat](https://octodex.github.com/images/stormtroopocat.jpg "The Stormtroopocat")
            `,
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'second article',
            body: `
            # h1 Heading 8-)
            ## h2 Heading
            ### h3 Heading
            #### h4 Heading
            ##### h5 Heading
            ###### h6 Heading
            `,
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const third = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'third article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
            excerpt: 'some excerpt',
          })
          .expect(201);
        const fourth = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'fourth article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);

        const article3 = third.body as Article;
        const article4 = fourth.body as Article;

        const getArticlesRes = await request(app.getHttpServer())
          .get(`/articles?cursorId=${article4.id}&limit=3&status=DRAFT`)
          .expect(200);
        const articles = getArticlesRes.body as BrowseArticlesResponseDto;
        expect(articles.data).toHaveLength(3);
        expect(articles.data[0].id).toBe(article3.id);
        expect(articles.data[0].excerpt).toBe('some excerpt');
        expect(articles.data[2].excerpt).toBe('Images');
        expect(articles.data[1].excerpt).toBe(
          'h1 Heading 8-) h2 Heading h3 Heading h4 Heading h5 Heading h6 Heading',
        );
        articles.data.forEach((a) => expect(a).not.toHaveProperty('body'));
      });

      it('fetches next page', async () => {
        const first = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'first article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const second = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'second article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'third article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'fourth article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);

        const article1 = first.body as Article;
        const article2 = second.body as Article;

        // fetch and assert first page next cursorId
        const firstPageRes = await request(app.getHttpServer())
          .get(`/articles?limit=3&status=DRAFT`)
          .expect(200);
        const firstPageArticles =
          firstPageRes.body as BrowseArticlesResponseDto;
        expect(firstPageArticles.data[2].id).toBe(article2.id);
        expect(firstPageArticles.hasMore).toBe(true);

        // use cursorId to fetch next page
        const secondPageRes = await request(app.getHttpServer())
          .get(`/articles?cursorId=${article2.id}&limit=3&status=DRAFT`)
          .expect(200);
        const articles = secondPageRes.body as BrowseArticlesResponseDto;
        expect(articles.data).toHaveLength(1);
        expect(articles.data[0].id).toBe(article1.id);
      });

      it('fetches articles<PUBLISHED> - order by publishedAt', async () => {
        const first = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'first article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const second = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'second article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const third = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'third article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);

        const article1 = first.body as Article;
        const article2 = second.body as Article;
        const article3 = third.body as Article;

        // publish in reverse order so publishedAt ranking != createdAt ranking
        await request(app.getHttpServer())
          .patch(`/articles/${article3.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/articles/${article2.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/articles/${article1.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        const getArticlesRes = await request(app.getHttpServer())
          .get(`/articles?limit=3&status=PUBLISHED`)
          .expect(200);
        const articles = getArticlesRes.body as BrowseArticlesResponseDto;

        // newest published first (first was published last)
        expect(articles.data.map((a) => a.id)).toEqual([
          article1.id,
          article2.id,
          article3.id,
        ]);
      });

      it('fetches articles<ARCHIVED> - order by publishedAt', async () => {
        const first = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'first article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const second = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'second article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const third = await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'third article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);

        const article1 = first.body as Article;
        const article2 = second.body as Article;
        const article3 = third.body as Article;

        // publish in reverse order so publishedAt ranking != createdAt ranking
        await request(app.getHttpServer())
          .patch(`/articles/${article3.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/articles/${article3.id}`)
          .send({ status: ArticleStatus.ARCHIVED })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/articles/${article2.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/articles/${article2.id}`)
          .send({ status: ArticleStatus.ARCHIVED })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/articles/${article1.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/articles/${article1.id}`)
          .send({ status: ArticleStatus.ARCHIVED })
          .expect(200);
        const getArticlesRes = await request(app.getHttpServer())
          .get(`/articles?limit=3&status=ARCHIVED`)
          .expect(200);
        const articles = getArticlesRes.body as BrowseArticlesResponseDto;

        // newest published first (first was published last)
        expect(articles.data.map((a) => a.id)).toEqual([
          article1.id,
          article2.id,
          article3.id,
        ]);
      });

      // it('fetches articles - derived excerpt', async () => {
      //   const first = await request(app.getHttpServer())
      //     .post('/articles')
      //     .send({
      //       title: 'first article',
      //       body: 'hello world',
      //       status: ArticleStatus.DRAFT,
      //     })
      //     .expect(201);

      //   const article1 = first.body as Article;

      //   // publish in reverse order so publishedAt ranking != createdAt ranking
      //   await request(app.getHttpServer())
      //     .patch(`/articles/${article3.id}`)
      //     .send({ status: ArticleStatus.PUBLISHED })
      //     .expect(200);
      //   await request(app.getHttpServer())
      //     .patch(`/articles/${article3.id}`)
      //     .send({ status: ArticleStatus.ARCHIVED })
      //     .expect(200);
      //   await request(app.getHttpServer())
      //     .patch(`/articles/${article2.id}`)
      //     .send({ status: ArticleStatus.PUBLISHED })
      //     .expect(200);
      //   await request(app.getHttpServer())
      //     .patch(`/articles/${article2.id}`)
      //     .send({ status: ArticleStatus.ARCHIVED })
      //     .expect(200);
      //   await request(app.getHttpServer())
      //     .patch(`/articles/${article1.id}`)
      //     .send({ status: ArticleStatus.PUBLISHED })
      //     .expect(200);
      //   await request(app.getHttpServer())
      //     .patch(`/articles/${article1.id}`)
      //     .send({ status: ArticleStatus.ARCHIVED })
      //     .expect(200);
      //   const getArticlesRes = await request(app.getHttpServer())
      //     .get(`/articles?limit=3&status=ARCHIVED`)
      //     .expect(200);
      //   const articles = getArticlesRes.body as FindArticlesResponseDto;

      //   // newest published first (first was published last)
      //   expect(articles.data.map((a) => a.id)).toEqual([
      //     article1.id,
      //     article2.id,
      //     article3.id,
      //   ]);
      // });
    });

    describe('search articles - search term', () => {
      it('fetches articles with search term', async () => {
        const searchTerm = 'article 1';
        await request(app.getHttpServer())
          .post('/articles')
          .send({
            title: 'first article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
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
          .get(
            `/articles/search?search=${encodeURIComponent(searchTerm)}&limit=3&status=DRAFT`,
          )
          .expect(200);
        const { data: articles } =
          getArticlesRes.body as SearchArticlesResponseDto;

        expect(articles).toHaveLength(2);
        expect(articles[1].id).toBe(article2.id);
        articles.forEach((a) =>
          expect(a).not.toHaveProperty(['body', 'excerpt']),
        );
        expect(articles[1].id).toBe(article2.id);
        expect(
          articles[1].headline.includes(
            `<b>${searchTerm.split(' ').join('</b> <b>')}</b>`,
          ),
        ).toBe(true);
        expect(articles[0].id).toBe(article3.id);
        expect(
          articles[0].headline.includes(
            `<b>${searchTerm.split(' ').join('</b> <b>')}</b>`,
          ),
        ).toBe(true);
      });
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
        .get(
          `/articles?cursorId=${crypto.randomUUID()}&limit=3&status=BAD_STATUS`,
        )
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

    it('cannot create article with ARCHIVED STATUS', async () => {
      await request(app.getHttpServer())
        .post('/articles')
        .send({ title: 'title', body: 'body', status: ArticleStatus.ARCHIVED })
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

    it('unknown slug should return 404', async () => {
      await request(app.getHttpServer()).get('/articles/my-slug').expect(404);
    });

    it('unknown article id should return 404', async () => {
      await request(app.getHttpServer())
        .get(`/articles/id/${crypto.randomUUID()}`)
        .expect(404);
    });

    it('deleting unknown article id should return 404', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${crypto.randomUUID()}`)
        .expect(404);
    });

    it('cannot filter articles by dates without status parameter', async () => {
      await request(app.getHttpServer())
        .get(`/articles?limit=2&startDate=2026-09-10`)
        .expect(400);
      await request(app.getHttpServer())
        .get(`/articles?limit=2&endDate=2026-09-10`)
        .expect(400);
      await request(app.getHttpServer())
        .get(`/articles?limit=2&startDate=2026-09-10&endDate=2026-09-12`)
        .expect(400);
    });
  });

  describe('edge cases', () => {
    it('creates unique slug if title is duplicate', async () => {
      const first = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'first article',
          body: 'hello world',
          status: ArticleStatus.DRAFT,
        })
        .expect(201);
      const article1 = first.body as Article;
      const second = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'first article',
          body: 'hello world',
          status: ArticleStatus.DRAFT,
        })
        .expect(201);

      const article2 = second.body as Article;

      const getArticlesRes = await request(app.getHttpServer())
        .get(`/articles?status=DRAFT`)
        .expect(200);
      const { data } = getArticlesRes.body as BrowseArticlesResponseDto;
      const [secondArticle, firstArticle] = data;

      expect(firstArticle).toMatchObject({
        id: article1.id,
        title: article1.title,
        slug: article1.slug,
        status: article1.status,
      });
      expect(secondArticle).toMatchObject({
        id: article2.id,
        title: article2.title,
        slug: article2.slug,
        status: article2.status,
      });
      expect(firstArticle.slug).not.toBe(secondArticle.slug);
    });

    it('finds article from old slug using slug history', async () => {
      const createArticleRes = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'original article',
          body: 'hello world',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);
      const originalArticle = createArticleRes.body as Article;
      await request(app.getHttpServer())
        .patch(`/articles/${originalArticle.id}`)
        .send({ title: 'new title' })
        .expect(200);

      const getArticlesRes = await request(app.getHttpServer())
        .get(`/articles/${originalArticle.slug}`)
        .expect(200);
      const fetchedArticle = getArticlesRes.body as Article;
      expect(fetchedArticle.slug).not.toEqual(originalArticle.slug);
      expect(fetchedArticle.id).toEqual(originalArticle.id);
    });

    it('throws 500 error when moving article from published to draft', async () => {
      const first = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'first article',
          body: 'hello',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);
      const firstArticle = first.body as Article;
      await request(app.getHttpServer())
        .patch(`/articles/${firstArticle.id}`)
        .send({
          status: ArticleStatus.DRAFT,
        })
        .expect(500);
    });

    it('throws 500 error when moving article from draft to archived', async () => {
      const first = await request(app.getHttpServer())
        .post('/articles')
        .send({
          title: 'first article',
          body: 'hello',
          status: ArticleStatus.DRAFT,
        })
        .expect(201);
      const firstArticle = first.body as Article;
      await request(app.getHttpServer())
        .patch(`/articles/${firstArticle.id}`)
        .send({
          status: ArticleStatus.ARCHIVED,
        })
        .expect(500);
    });
  });
});
