import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ScamTypesService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.scamType.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.scamType.findUnique({
      where: { id },
    });
  }

  async findOneBySlug(slug: string) {
    return this.prisma.scamType.findUnique({
      where: { slug },
    });
  }
}