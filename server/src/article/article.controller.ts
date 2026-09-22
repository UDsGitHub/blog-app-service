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
import { ApiOkResponse } from '@nestjs/swagger';
import {
  BrowseArticlesQueryDto,
  BrowseArticlesResponseDto,
} from './dto/browse-articles.dto';
import { Article, ArticleStatus } from '../generated/prisma/client';
import {
  SearchArticlesQueryDto,
  SearchArticlesResponseDto,
} from './dto/search-articles.dto';
import { ArticleEntity } from './article.entity';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  async createArticle(
    @Body() createArticleDto: CreateArticleDto,
  ): Promise<Article> {
    if (createArticleDto.status === ArticleStatus.ARCHIVED) {
      throw new BadRequestException(
        'cannot create article with ARCHIVED status',
      );
    }

    return this.articleService.create(createArticleDto);
  }

  @Get()
  @ApiOkResponse({
    type: BrowseArticlesResponseDto,
  })
  async browseArticles(
    @Query() query: BrowseArticlesQueryDto,
  ): Promise<BrowseArticlesResponseDto> {
    if ((query.startDate || query.endDate) && !query.status) {
      throw new BadRequestException(
        'status is required when filtering by startDate or endDate',
      );
    }

    return this.articleService.browse(
      query.limit,
      query.cursorId,
      query.status,
      query.startDate,
      query.endDate,
    );
  }

  @Get('/search')
  @ApiOkResponse({
    type: SearchArticlesResponseDto,
  })
  async searchArticles(
    @Query() query: SearchArticlesQueryDto,
  ): Promise<SearchArticlesResponseDto> {
    if ((query.startDate || query.endDate) && !query.status) {
      throw new BadRequestException(
        'status is required when filtering by startDate or endDate',
      );
    }

    return this.articleService.search(
      query.limit,
      query.search,
      query.status,
      query.startDate,
      query.endDate,
    );
  }

  @Get('id/:id')
  @ApiOkResponse({ type: ArticleEntity })
  async findById(@Param('id') id: string) {
    return this.articleService.findById(id);
  }

  @Get(':slug')
  @ApiOkResponse({ type: ArticleEntity })
  async findBySlug(@Param('slug') slug: string) {
    return this.articleService.findBySlug(slug);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ArticleEntity })
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
  @ApiOkResponse({ type: ArticleEntity })
  removeArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Article> {
    return this.articleService.remove(id);
  }
}
