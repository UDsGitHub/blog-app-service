import { Injectable } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaService } from './prisma.service';
import slug from 'slug';

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

  findAll() {
    return this.prisma.article.findMany({ orderBy: { createdAt: 'asc' } });
  }

  findOne(slug: string) {
    return this.prisma.article.findUnique({
      where: {
        slug,
      },
    });
  }

  async update(id: string, updateArticleDto: UpdateArticleDto) {
    const updateData = { ...updateArticleDto };

    if (updateArticleDto.title) {
      const updatedSlug = await this.getSlug(updateArticleDto.title, id);
      updateData['slug'] = updatedSlug;
    }

    return this.prisma.article.update({
      data: updateData,
      where: { id },
    });
  }

  remove(id: string) {
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
