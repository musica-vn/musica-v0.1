import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFile } from 'fs/promises';
import path from 'path';
import { AppModule } from './app.module';

const main = async (): Promise<void> => {
  process.env.SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-service-role-key';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
  process.env.STORAGE_BUCKET_ORIGINAL_AUDIO =
    process.env.STORAGE_BUCKET_ORIGINAL_AUDIO ?? 'original-audio';
  process.env.STORAGE_BUCKET_PREVIEW_AUDIO =
    process.env.STORAGE_BUCKET_PREVIEW_AUDIO ?? 'preview-audio';
  process.env.STORAGE_BUCKET_CERTIFICATES =
    process.env.STORAGE_BUCKET_CERTIFICATES ?? 'certificates';
  process.env.STORAGE_BUCKET_TRACK_THUMBNAILS =
    process.env.STORAGE_BUCKET_TRACK_THUMBNAILS ?? 'track-thumbnails';

  const app = await NestFactory.create(AppModule, { logger: false });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Musica API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  const outputPath = path.resolve(__dirname, '..', 'openapi.json');
  await writeFile(
    outputPath,
    JSON.stringify(swaggerDocument, null, 2),
    'utf-8',
  );

  await app.close();
};

void main();
