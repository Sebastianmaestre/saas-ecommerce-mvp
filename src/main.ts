import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // en prod, restringir a los dominios/subdominios de las tiendas
  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 Server corriendo en puerto ${process.env.PORT || 3000}`);
}
bootstrap();
