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
  Req,
  UseGuards,
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
import type { AuthenticatedRequest } from '../guard/authenticated-request.interface';
import { AdminOnly } from '../guard/admin-only.decorator';
import { ArticleQueryGuard } from './article-query.guard';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @AdminOnly(true)
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
  @UseGuards(ArticleQueryGuard)
  @ApiOkResponse({
    type: BrowseArticlesResponseDto,
  })
  async browseArticles(
    @Query() query: BrowseArticlesQueryDto,
  ): Promise<BrowseArticlesResponseDto> {
    return this.articleService.browse(
      query.limit,
      query.cursorId,
      query.status,
      query.startDate,
      query.endDate,
    );
  }

  @Get('/search')
  @UseGuards(ArticleQueryGuard)
  @ApiOkResponse({
    type: SearchArticlesResponseDto,
  })
  async searchArticles(
    @Query() query: SearchArticlesQueryDto,
  ): Promise<SearchArticlesResponseDto> {
    return this.articleService.search(
      query.limit,
      query.search,
      query.status,
      query.startDate,
      query.endDate,
    );
  }

  @Get('id/:id')
  @AdminOnly(true)
  @ApiOkResponse({ type: ArticleEntity })
  async findById(@Param('id') id: string) {
    return this.articleService.findById(id);
  }

  @Get(':slug')
  @ApiOkResponse({ type: ArticleEntity })
  async findBySlug(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ) {
    return this.articleService.findBySlug(request.isAuthenticated, slug);
  }

  @Patch(':id')
  @AdminOnly(true)
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
  @AdminOnly(true)
  @ApiOkResponse({ type: ArticleEntity })
  removeArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Article> {
    return this.articleService.remove(id);
  }
}
