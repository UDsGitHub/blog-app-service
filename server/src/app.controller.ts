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
import { AppService } from './app.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from './entities/article.entity';
import { ApiResponse } from '@nestjs/swagger';
import { FindArticlesQueryDto } from './dto/find-articles.dto';

@Controller('articles')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @ApiResponse({
    type: Article,
  })
  async createArticle(
    @Body() createArticleDto: CreateArticleDto,
  ): Promise<Article> {
    return this.appService.create(createArticleDto);
  }

  @Get()
  @ApiResponse({
    type: Article,
    isArray: true,
  })
  async findArticles(@Query() query: FindArticlesQueryDto): Promise<Article[]> {
    if (query.cursorId && query.search) {
      throw new BadRequestException(
        'cursorId cannot be set when passing search term.',
      );
    }
    return this.appService.findAll(query.limit, query.cursorId, query.search);
  }

  @Get(':slug')
  @ApiResponse({
    type: Article,
  })
  async findArticle(@Param('slug') slug: string): Promise<Article | null> {
    return this.appService.findBySlug(slug);
  }

  @Patch(':id')
  @ApiResponse({
    type: Article,
  })
  updateArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<Article> {
    if (
      (updateArticleDto?.title === undefined ||
        updateArticleDto?.title === null) &&
      (updateArticleDto?.body === undefined || updateArticleDto?.body === null)
    ) {
      throw new BadRequestException(
        'At least one field is required to update the article',
      );
    }
    return this.appService.update(id, updateArticleDto);
  }

  @Delete(':id')
  @ApiResponse({
    type: Article,
  })
  removeArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Article> {
    return this.appService.remove(id);
  }
}
