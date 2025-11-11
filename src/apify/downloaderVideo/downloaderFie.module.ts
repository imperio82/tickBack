// File: src/video-downloader/video-downloader.module.ts

import { Module } from '@nestjs/common';
import { VideoDownloaderService } from './downloadFile';
import { GoogleStorageService } from 'src/util/storage';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [VideoDownloaderService, GoogleStorageService],
  exports: [VideoDownloaderService], // <-- ¡PASO CLAVE! Aquí lo haces disponible para otros módulos.
})
export class VideoDownloaderModule {}