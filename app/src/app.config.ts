import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Applies the same request pipeline in main.ts and in the e2e test, so the
 * tests cannot pass while production silently loses validation.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      // Drop properties that are not declared on the DTO.
      whitelist: true,
    }),
  );
}
