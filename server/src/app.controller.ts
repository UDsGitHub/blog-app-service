import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AppService } from './app.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from './entities/article.entity';
import { ApiResponse } from '@nestjs/swagger';

@Controller('articles')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @ApiResponse({
    type: Article,
  })
  createArticle(@Body() createArticleDto: CreateArticleDto): Promise<Article> {
    return this.appService.create(createArticleDto);
  }

  @Get()
  @ApiResponse({
    type: Article,
    isArray: true,
  })
  findArticles(): Promise<Article[]> {
    return this.appService.findAll();
  }

  @Get(':slug')
  @ApiResponse({
    type: Article,
  })
  async findArticle(@Param('slug') slug: string): Promise<Article | null> {
    const article = await this.appService.findOne(slug);
    if (article === null) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  @Patch(':id')
  @ApiResponse({
    type: Article,
  })
  updateArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<Article> | null {
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
