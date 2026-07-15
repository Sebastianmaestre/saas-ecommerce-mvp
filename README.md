# SaaS Multi-Tienda E-commerce (MVP)

Plataforma que aloja **múltiples tiendas independientes** sobre una única
infraestructura, pensada para escalar a **2000+ tiendas**.

## Arquitectura elegida: Shared Schema + Row-Level Tenancy

En vez de crear una base de datos (o schema) por tienda, **todas las tiendas
comparten las mismas tablas**, y cada fila lleva un `tenantId` que indica de
qué tienda es. Es la única estrategia que aguanta miles de tenants sin
volverse un infierno operativo (migraciones, backups, conexiones a DB, etc.
se manejan una sola vez, no 2000 veces).

```
Cliente pide: tienda123.plataforma.com/products
        │
        ▼
Nginx (wildcard subdomain) ──► NestJS
        │
        ▼
TenantMiddleware: resuelve "tienda123" → tenantId (UUID)
        │
        ▼
Todos los queries a la DB llevan WHERE tenantId = 'xxx'
```

### Capas de seguridad contra fuga de datos entre tiendas
1. El `TenantMiddleware` resuelve el tenant UNA vez por request (por subdominio
   o dominio propio) y lo cuelga en `req.tenantId`.
2. El decorator `@CurrentTenant()` lo inyecta en cualquier controller.
3. `PrismaService.forTenant(tenantId)` fuerza el `where: { tenantId }` en
   TODOS los queries — así es imposible que un desarrollador se olvide del
   filtro y exponga datos de otra tienda por accidente.

## Estructura del proyecto

```
prisma/
  schema.prisma          → modelo de datos completo (Tenant, Product, Order, etc.)
src/
  main.ts                → entry point
  app.module.ts           → conecta el TenantMiddleware globalmente
  prisma.service.ts       → cliente Prisma + helper forTenant()
  common/
    middleware/tenant.middleware.ts   → resuelve tenant por subdominio/header
    decorators/current-tenant.decorator.ts
  modules/
    tenants/              → alta/baja de tiendas (panel super-admin, /platform/*)
    products/             → CRUD de productos (ejemplo completo, ya aislado por tenant)
    orders/  categories/  customers/  auth/   → carpetas listas para completar
```

## Cómo levantarlo

```bash
npm install
# configurar .env con DATABASE_URL de Postgres
npx prisma migrate dev --name init
npm run start:dev
```

## Cómo se resuelve cada tienda

- **Subdominio automático**: `{slug}.plataforma.com` (necesita wildcard DNS
  `*.plataforma.com` apuntando al mismo servidor, y Nginx configurado con
  `server_name ~^(?<subdomain>.+)\.plataforma\.com$`)
- **Dominio propio** (plan superior): la tienda apunta su dominio (CNAME) al
  servidor, y se guarda en `Tenant.customDomain`.

## Qué falta para completar el MVP
- [ ] Módulo `auth` con JWT (login por tienda + login super-admin)
- [ ] Módulo `orders` completo (carrito → checkout → pago)
- [ ] Guard de roles (`SUPER_ADMIN` vs `STORE_ADMIN` vs `STORE_STAFF`)
- [ ] Integración de pagos (QR/Stripe/etc. según el mercado)
- [ ] Panel de super-admin (Next.js) para dar de alta tiendas
- [ ] Storefront público por tienda (Next.js, una sola app, theming dinámico
      según `Tenant.primaryColor` / `logoUrl`)
- [ ] Rate limiting por tenant (para que una tienda no tumbe a las demás)

## Nginx (wildcard subdomain) — referencia

```nginx
server {
  listen 80;
  server_name ~^(?<subdomain>.+)\.plataforma\.com$;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Tenant-Slug $subdomain;
  }
}
```
