import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
  findArticle(@Param('slug') slug: string): Promise<Article | null> {
    return this.appService.findOne(slug);
  }

  @Patch(':id')
  updateArticle(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<Article> {
    return this.appService.update(id, updateArticleDto);
  }

  @Delete(':id')
  removeArticle(@Param('id') id: string): Promise<Article> {
    return this.appService.remove(id);
  }
}
