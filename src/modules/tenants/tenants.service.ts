import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; slug: string; ownerEmail: string; ownerPassword: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Ese slug de tienda ya está en uso');

    // Crea el tenant + su settings por defecto + el usuario admin de la tienda
    // en una sola transacción para que nunca quede un tenant "huérfano"
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          settings: { create: {} }, // defaults
        },
      });

      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.ownerEmail,
          password: data.ownerPassword, // recordar: hashear con bcrypt antes de guardar
          name: data.name,
          role: 'STORE_ADMIN',
        },
      });

      return tenant;
    });
  }

  findAll() {
    return this.prisma.tenant.findMany({
      select: { id: true, slug: true, name: true, plan: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async suspend(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tienda no encontrada');
    return this.prisma.tenant.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }
}
