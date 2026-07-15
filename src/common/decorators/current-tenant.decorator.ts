import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

// Uso en un controller: findAll(@CurrentTenant() tenantId: string)
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.tenantId) {
      throw new BadRequestException('No se pudo resolver el tenant de la petición');
    }
    return request.tenantId;
  },
);
