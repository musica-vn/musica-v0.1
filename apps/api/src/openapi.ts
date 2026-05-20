import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFile } from 'fs/promises';
import path from 'path';
import { AppModule } from './app.module';

const main = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, { logger: false });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Musica API')
    .setVersion('1.0.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  const outputPath = path.resolve(__dirname, '..', 'openapi.json');
  await writeFile(outputPath, JSON.stringify(swaggerDocument, null, 2), 'utf-8');

  await app.close();
};

void main();
