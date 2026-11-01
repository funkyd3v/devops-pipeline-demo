import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  // PORT is injected by Docker/Kubernetes; 3000 is the local default.
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
