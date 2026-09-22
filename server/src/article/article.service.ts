import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaService } from '../prisma.service';
import slug from 'slug';
import { ArticleStatus } from '../generated/prisma/enums';
import { FindArticlesResponseDto } from './dto/find-articles.dto';
import { Article, Prisma } from '../generated/prisma/client';
import { ArticlePreview } from './article.types';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createArticleDto: CreateArticleDto) {
    const { title, body, status } = createArticleDto;

    const titleSlug = await this.getSlug(title);
    const createData = { title, body, slug: titleSlug, status };
    if (status === ArticleStatus.PUBLISHED) {
      createData['publishedAt'] = new Date();
    }

    return this.prisma.article.create({
      data: createData,
    });
  }

  async findAll(
    limit: number,
    cursorId?: string,
    search?: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FindArticlesResponseDto> {
    if (search?.trim()) {
      return this.searchArticles(limit, search, status, startDate, endDate);
    } else {
      return this.browseArticles(limit, cursorId, status, startDate, endDate);
    }
  }

  async findBySlug(slug: string) {
    let article = await this.prisma.article.findUnique({
      where: {
        slug,
      },
    });

    // fallback to slug history
    if (!article) {
      const slugHistoryRecord = await this.prisma.articleSlugHistory.findUnique(
        {
          where: {
            slug,
          },
          select: {
            articleId: true,
          },
        },
      );

      if (!slugHistoryRecord?.articleId) {
        throw new NotFoundException(`Article with slug: ${slug} not found`);
      }

      article = await this.findById(slugHistoryRecord.articleId);
      if (!article) {
        throw new NotFoundException(`Article with slug: ${slug} not found`);
      }
    }

    return article;
  }

  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: {
        id,
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with id: ${id} not found`);
    }

    return article;
  }

  async update(id: string, updateArticleDto: UpdateArticleDto) {
    const updateData = { ...updateArticleDto };

    const article = await this.findById(id);
    // set publishedAt once if article switches from draft to published
    if (
      updateData?.status === ArticleStatus.PUBLISHED &&
      article.status === ArticleStatus.DRAFT &&
      !article.publishedAt
    ) {
      updateData['publishedAt'] = new Date();
    }

    // throw error if moving from published -> draft or draft -> archived
    const publishedToDraft =
      updateData?.status === ArticleStatus.DRAFT &&
      article.status === ArticleStatus.PUBLISHED;
    const draftToArchived =
      updateData?.status === ArticleStatus.ARCHIVED &&
      article.status === ArticleStatus.DRAFT;
    if (publishedToDraft || draftToArchived) {
      throw new InternalServerErrorException(
        'Cannot save publish article into drafts',
      );
    }

    updateData['updatedAt'] = new Date();
    if (updateArticleDto.title) {
      const updatedSlug = await this.getSlug(updateArticleDto.title, id);
      updateData['slug'] = updatedSlug;
      // set slug history if published article changes title
      if (article?.status === ArticleStatus.PUBLISHED) {
        await this.prisma.articleSlugHistory.create({
          data: { articleId: article.id, slug: article.slug },
        });
      }
    }

    return this.prisma.article.update({
      data: updateData,
      where: { id },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.article.delete({ where: { id } });
  }

  private async getSlug(
    inputString: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slug(inputString);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
      const count = await this.prisma.article.count({
        where: {
          slug: uniqueSlug,
          ...(excludeId
            ? {
                id: {
                  not: excludeId,
                },
              }
            : {}),
        },
      });

      if (count === 0) {
        break;
      }

      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  private getFilterDateColumn(
    status?: ArticleStatus,
  ): 'publishedAt' | 'createdAt' | null {
    if (!status) return null;
    if (status === ArticleStatus.DRAFT) return 'createdAt';
    return 'publishedAt';
  }

  private async browseArticles(
    limit: number,
    cursorId?: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.ArticleWhereInput = {};
    const dateCol = this.getFilterDateColumn(status);

    if (status) {
      where.status = status;
    }

    if (dateCol && (startDate || endDate)) {
      where[dateCol] = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const orderBy: Prisma.ArticleOrderByWithRelationInput[] =
      dateCol === 'publishedAt'
        ? [{ publishedAt: 'desc' as const }, { id: 'desc' as const }]
        : [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

    const query: Prisma.ArticleFindManyArgs = {
      where,
      orderBy,
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    };

    const results = (
      await this.prisma.article.findMany(query)
    ).map<ArticlePreview>((article) => {
      const { body, ...rest } = article;
      return rest;
    });
    return {
      data: results.slice(0, limit),
      hasMore: results.length > limit,
    };
  }

  private async searchArticles(
    limit: number,
    search: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const filters: Prisma.Sql[] = [Prisma.sql`a.search_vector @@ q`];

    if (status) {
      filters.push(Prisma.sql`a.status = ${status}::"ArticleStatus"`);
    }

    const dateCol = this.getFilterDateColumn(status);
    if (dateCol === 'publishedAt') {
      if (startDate) {
        filters.push(Prisma.sql`a.published_at >= ${startDate}`);
      }
      if (endDate) {
        filters.push(Prisma.sql`a.published_at <= ${endDate}`);
      }
    } else if (dateCol === 'createdAt') {
      if (startDate) {
        filters.push(Prisma.sql`a.created_at >= ${startDate}`);
      }
      if (endDate) {
        filters.push(Prisma.sql`a.created_at <= ${endDate}`);
      }
    }

    const results = await this.prisma.$queryRaw<Article[]>`
        select 
          a.id, 
          a.title, 
          a.slug,  
          a.status, 
          a.excerpt, 
          a.created_at as "createdAt", 
          a.updated_at as "updatedAt",
          ts_headline('english', a.body, q) as body
        from 
          article a, 
          plainto_tsquery('english', ${search}) as q 
        where 
          ${Prisma.join(filters, ' and ')} 
          order by 
            ts_rank(a.search_vector, q) desc, 
            a.published_at desc, 
            a.created_at desc, 
            a.id desc 
          limit ${limit};`;

    return {
      data: results,
      hasMore: false,
    };
  }
}
