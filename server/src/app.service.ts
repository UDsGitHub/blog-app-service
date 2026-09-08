import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getHello(): Promise<string> {
    const thing = await this.prisma.article.findMany();
    console.error(thing);
    return 'Hello World!';
  }
}
