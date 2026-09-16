import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaService } from './prisma.service';
import slug from 'slug';
import { Article } from './entities/article.entity';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createArticleDto: CreateArticleDto) {
    const { title, body } = createArticleDto;
    const titleSlug = await this.getSlug(title);
    return this.prisma.article.create({
      data: { title, body, slug: titleSlug },
    });
  }

  async findAll(limit: number, cursorId?: string, search?: string) {
    const query = {
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
      take: limit,
    };
    if (cursorId) {
      query['cursor'] = { id: cursorId };
      query['skip'] = 1;
    }
    if (!search?.trim()) {
      return this.prisma.article.findMany(query);
    } else {
      return this.prisma.$queryRaw<Article[]>`
        select 
          a.id, a.title, a.slug, a.body, a.created_at as "createdAt", a.updated_at as "updatedAt"
        from 
          article a, 
          plainto_tsquery('english', ${search}) as q 
        where search_vector @@ q order by ts_rank(search_vector, q) desc, a.created_at desc, a.id desc limit ${limit};`;
    }
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: {
        slug,
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with slug: ${slug} not found`);
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

    await this.findById(id);

    if (updateArticleDto.title) {
      const updatedSlug = await this.getSlug(updateArticleDto.title, id);
      updateData['slug'] = updatedSlug;
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
}
