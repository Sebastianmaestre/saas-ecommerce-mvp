import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.forTenant(tenantId).product.findFirst({
      where: { id },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  create(tenantId: string, data: { name: string; slug: string; price: number; stock: number; categoryId?: string }) {
    return this.prisma.forTenant(tenantId).product.create({ data });
  }

  update(tenantId: string, id: string, data: Partial<{ name: string; price: number; stock: number; isActive: boolean }>) {
    return this.prisma.forTenant(tenantId).product.update({ where: { id }, data });
  }

  remove(tenantId: string, id: string) {
    return this.prisma.forTenant(tenantId).product.delete({ where: { id } });
  }
}
