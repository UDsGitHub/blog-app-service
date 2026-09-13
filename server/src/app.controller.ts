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

@Controller('articles')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  createArticle(@Body() createArticleDto: CreateArticleDto) {
    return this.appService.create(createArticleDto);
  }

  @Get()
  findArticles() {
    return this.appService.findAll();
  }

  @Get(':slug')
  findArticle(@Param('slug') slug: string) {
    return this.appService.findOne(slug);
  }

  @Patch(':id')
  updateArticle(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.appService.update(id, updateArticleDto);
  }

  @Delete(':id')
  removeArticle(@Param('id') id: string) {
    return this.appService.remove(id);
  }
}
