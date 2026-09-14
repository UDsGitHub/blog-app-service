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

@Controller('articles')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  createArticle(@Body() createArticleDto: CreateArticleDto): Promise<Article> {
    return this.appService.create(createArticleDto);
  }

  @Get()
  findArticles(): Promise<Article[]> {
    return this.appService.findAll();
  }

  @Get(':slug')
  async findArticle(@Param('slug') slug: string): Promise<Article | null> {
    const article = await this.appService.findOne(slug);
    if (article === null) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  @Patch(':id')
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
  removeArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Article> {
    return this.appService.remove(id);
  }
}
