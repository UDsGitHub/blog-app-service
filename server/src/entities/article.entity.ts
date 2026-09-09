export class Article {
  id: string = '';
  title: string = '';
  slug: string = '';
  body: string = '';
  createdAt: Date = new Date();
  updatedAt?: Date;
}
