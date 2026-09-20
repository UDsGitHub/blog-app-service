import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ApiResponse } from '@nestjs/swagger';
import {
  FindArticlesQueryDto,
  FindArticlesResponseDto,
} from './dto/find-articles.dto';
import { Article } from '../generated/prisma/client';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  async createArticle(
    @Body() createArticleDto: CreateArticleDto,
  ): Promise<Article> {
    return this.articleService.create(createArticleDto);
  }

  @Get()
  @ApiResponse({
    type: FindArticlesResponseDto,
  })
  async findArticles(
    @Query() query: FindArticlesQueryDto,
  ): Promise<FindArticlesResponseDto> {
    if (query.cursorId && query.search) {
      throw new BadRequestException(
        'cursorId cannot be set when passing search term.',
      );
    }
    return this.articleService.findAll(
      query.limit,
      query.cursorId,
      query.search,
      query.status,
    );
  }

  @Get(':slug')
  async findArticle(@Param('slug') slug: string) {
    return this.articleService.findBySlug(slug);
  }

  @Patch(':id')
  updateArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<Article> {
    if (
      (updateArticleDto?.title === undefined ||
        updateArticleDto?.title === null) &&
      (updateArticleDto?.body === undefined ||
        updateArticleDto?.body === null) &&
      (updateArticleDto?.status === undefined ||
        updateArticleDto?.status === null)
    ) {
      throw new BadRequestException(
        'At least one field is required to update the article',
      );
    }
    return this.articleService.update(id, updateArticleDto);
  }

  @Delete(':id')
  removeArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Article> {
    return this.articleService.remove(id);
  }
}
