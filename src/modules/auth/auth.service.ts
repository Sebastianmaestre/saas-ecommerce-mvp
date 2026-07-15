import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // saca tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  // Devuelve el primer slug disponible: "zapateria-ana", "zapateria-ana-2", etc.
  async suggestAvailableSlug(name: string): Promise<string> {
    const base = slugify(name) || 'tienda';
    let candidate = base;
    let i = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug: candidate } })) {
      i++;
      candidate = `${base}-${i}`;
    }
    return candidate;
  }

  // Chequeo en vivo mientras el usuario escribe el nombre de su tienda (para el wizard)
  async checkSlugAvailability(slug: string): Promise<{ available: boolean; suggestion?: string }> {
    const clean = slugify(slug);
    const existing = await this.prisma.tenant.findUnique({ where: { slug: clean } });
    if (!existing) return { available: true };
    return { available: false, suggestion: await this.suggestAvailableSlug(clean) };
  }

  // Signup público: cualquiera puede crear su tienda desde la landing, sin intervención manual
  async signup(data: { storeName: string; email: string; password: string; slug?: string }) {
    const slug = data.slug ? slugify(data.slug) : await this.suggestAvailableSlug(data.storeName);

    const slugTaken = await this.prisma.tenant.findUnique({ where: { slug } });
    if (slugTaken) throw new ConflictException('Ese subdominio ya está en uso, elegí otro');

    const emailTaken = await this.prisma.user.findFirst({ where: { email: data.email } });
    if (emailTaken) throw new ConflictException('Ya existe una cuenta con ese email');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const tenant = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: data.storeName,
          slug,
          plan: 'FREE',
          status: 'ACTIVE',
          settings: { create: {} },
        },
      });

      await tx.user.create({
        data: {
          tenantId: newTenant.id,
          email: data.email,
          password: hashedPassword,
          name: data.storeName,
          role: 'STORE_ADMIN',
        },
      });

      return newTenant;
    });

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      storeUrl: `https://${tenant.slug}.tuplataforma.com`,
    };
  }

  async login(email: string, password: string, slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new UnauthorizedException('Tienda no encontrada');

    const user = await this.prisma.user.findFirst({ where: { tenantId: tenant.id, email } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    // Acá se firma un JWT real con @nestjs/jwt (queda pendiente, ahora devuelve el user)
    return { userId: user.id, tenantId: tenant.id, role: user.role };
  }
}
