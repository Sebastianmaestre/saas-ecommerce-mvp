import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

// Estas rutas son PÚBLICAS a propósito: cualquiera puede crear su tienda sola,
// sin que un admin de la plataforma tenga que intervenir.
@Controller('platform/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // GET /platform/auth/check-slug?name=Zapatería Ana
  // Usado en vivo por el wizard mientras el usuario tipea el nombre de su tienda
  @Get('check-slug')
  async checkSlug(@Query('name') name: string) {
    return this.authService.checkSlugAvailability(name);
  }

  // POST /platform/auth/signup
  @Post('signup')
  signup(@Body() body: { storeName: string; email: string; password: string; slug?: string }) {
    return this.authService.signup(body);
  }

  // POST /platform/auth/login
  @Post('login')
  login(@Body() body: { email: string; password: string; slug: string }) {
    return this.authService.login(body.email, body.password, body.slug);
  }
}
