import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper para queries ya filtradas por tenant.
  // Los services SIEMPRE deben usar esto en vez de this.prisma.product directo,
  // así es imposible olvidarse del where: { tenantId } en algún query.
  forTenant(tenantId: string) {
    return {
      product: {
        findMany: (args: any = {}) =>
          this.product.findMany({ ...args, where: { ...args.where, tenantId } }),
        findFirst: (args: any = {}) =>
          this.product.findFirst({ ...args, where: { ...args.where, tenantId } }),
        create: (args: any) =>
          this.product.create({ ...args, data: { ...args.data, tenantId } }),
        update: (args: any) =>
          this.product.updateMany({ ...args, where: { ...args.where, tenantId } }),
        delete: (args: any) =>
          this.product.deleteMany({ ...args, where: { ...args.where, tenantId } }),
      },
      order: {
        findMany: (args: any = {}) =>
          this.order.findMany({ ...args, where: { ...args.where, tenantId } }),
        create: (args: any) =>
          this.order.create({ ...args, data: { ...args.data, tenantId } }),
      },
      category: {
        findMany: (args: any = {}) =>
          this.category.findMany({ ...args, where: { ...args.where, tenantId } }),
      },
      customer: {
        findMany: (args: any = {}) =>
          this.customer.findMany({ ...args, where: { ...args.where, tenantId } }),
        create: (args: any) =>
          this.customer.create({ ...args, data: { ...args.data, tenantId } }),
      },
    };
  }
}
