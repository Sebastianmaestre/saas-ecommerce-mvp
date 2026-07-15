import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma.service';

// Extendemos Request para poder acceder a req.tenant en cualquier controller
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: { id: string; slug: string; status: string };
    }
  }
}

const PLATFORM_ROOT_DOMAIN = process.env.PLATFORM_ROOT_DOMAIN || 'plataforma.com';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1) Header explícito (útil para admin panel / API calls internas)
    const headerSlug = req.headers['x-tenant-slug'] as string | undefined;

    // 2) Subdominio: {slug}.plataforma.com  o dominio propio custom
    const host = (req.headers.host || '').split(':')[0];
    let slug: string | undefined = headerSlug;

    if (!slug && host.endsWith(`.${PLATFORM_ROOT_DOMAIN}`)) {
      slug = host.replace(`.${PLATFORM_ROOT_DOMAIN}`, '');
    }

    // 3) Rutas de plataforma (panel super-admin) no requieren tenant
    if (req.path.startsWith('/platform')) {
      return next();
    }

    let tenant = null;

    if (slug) {
      tenant = await this.prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, slug: true, status: true },
      });
    } else {
      // custom domain
      tenant = await this.prisma.tenant.findFirst({
        where: { customDomain: host },
        select: { id: true, slug: true, status: true },
      });
    }

    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Tienda no disponible actualmente');
    }

    req.tenantId = tenant.id;
    req.tenant = tenant;
    next();
  }
}
