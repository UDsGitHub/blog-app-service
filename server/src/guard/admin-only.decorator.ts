import { Reflector } from '@nestjs/core';

export const AdminOnly = Reflector.createDecorator<boolean>();
