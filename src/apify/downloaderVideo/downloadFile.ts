// video-downloader.service.ts
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { platform } from 'os';
import { GoogleStorageService } from '../../util/storage';

const execAsync = promisify(exec);

interface VideoInfo {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  upload_date: string;
  thumbnail: string;
  description?: string;
  webpage_url: string;
  filesize?: number;
  format_id: string;
}

interface DownloadProgress {
  percent: number;
  speed?: string;
  eta?: string;
  downloaded?: string;
  total?: string;
}

interface DownloadResult {
  publicUrl: string;
  fileName: string;
  videoInfo: VideoInfo;
  bucketName: string;
  gcsPath: string;
}

@Injectable()
export class VideoDownloaderService {
  private readonly logger = new Logger(VideoDownloaderService.name);
  private readonly tempDir = './temp';
  private readonly bucketName = 'archivosvideos';
  private ytDlpPath: string = '';

  constructor(private readonly googleStorageService: GoogleStorageService) {
    this.initDirectories();
    this.findYtDlpPath();
  }

  private initDirectories() {
    // Solo necesitamos el directorio temporal
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private async findYtDlpPath() {
    const isWindows = platform() === 'win32';
    
    // Posibles ubicaciones de yt-dlp
    const possiblePaths = [
      'yt-dlp', // PATH normal
      'C:\\Python\\Scripts\\yt-dlp.exe',
      'C:\\Python311\\Scripts\\yt-dlp.exe',
      'C:\\Python312\\Scripts\\yt-dlp.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\yt-dlp.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\yt-dlp.exe',
    ];

    // En Windows, también intentamos con where
    if (isWindows) {
      try {
        const { stdout } = await execAsync('where yt-dlp', { timeout: 5000 });
        const foundPath = stdout.trim().split('\n')[0];
        if (foundPath) {
          this.ytDlpPath = foundPath;
          this.logger.log(`yt-dlp encontrado en: ${this.ytDlpPath}`);
          return;
        }
      } catch (error) {
        this.logger.warn('No se pudo encontrar yt-dlp con "where"');
      }
    }

    // Probar cada ruta posible
    for (const testPath of possiblePaths) {
      try {
        const command = isWindows && !testPath.endsWith('.exe') 
          ? `"${testPath}.exe" --version` 
          : `"${testPath}" --version`;
        
        await execAsync(command, { timeout: 5000 });
        this.ytDlpPath = testPath;
        this.logger.log(`yt-dlp encontrado en: ${this.ytDlpPath}`);
        return;
      } catch (error) {
        // Continuar probando otras rutas
      }
    }

    // Si no encontramos nada, usar el PATH normal y mostrar error
    this.ytDlpPath = 'yt-dlp';
    this.logger.error('yt-dlp no encontrado. Asegúrate de que esté instalado y en el PATH');
    this.logger.error('Intenta: pip install yt-dlp');
    this.logger.error('O descarga desde: https://github.com/yt-dlp/yt-dlp/releases');
  }

  private async checkYtDlpInstallation() {
    try {
      const command = platform() === 'win32' && !this.ytDlpPath.endsWith('.exe')
        ? `"${this.ytDlpPath}.exe" --version`
        : `"${this.ytDlpPath}" --version`;
      
      const { stdout } = await execAsync(command, { timeout: 10000 });
      this.logger.log(`yt-dlp versión: ${stdout.trim()}`);
    } catch (error) {
      this.logger.error(`Error verificando yt-dlp: ${error.message}`);
      throw new HttpException(
        'yt-dlp no está disponible. Por favor instálalo o verifica la configuración.',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  // Obtener información del video sin descargarlo
  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      this.validateUrl(url);
      
      // Verificar que yt-dlp esté disponible antes de usar
      await this.checkYtDlpInstallation();
      
      // Construir comando usando spawn para evitar problemas de comillas
      const args = ['-j', '--no-warnings', url];
      
      const { stdout } = await this.executeCommand(this.ytDlpPath, args, { timeout: 30000 });
      
      const info = JSON.parse(stdout.trim());
      
      return {
        id: info.id,
        title: info.title,
        uploader: info.uploader || info.channel || 'Desconocido',
        duration: info.duration,
        view_count: info.view_count,
        like_count: info.like_count,
        comment_count: info.comment_count,
        upload_date: info.upload_date,
        thumbnail: info.thumbnail,
        description: info.description,
        webpage_url: info.webpage_url,
        filesize: info.filesize,
        format_id: info.format_id
      };
    } catch (error) {
      this.logger.error(`Error obteniendo información del video: ${error.message}`);
      throw new HttpException(
        `Error obteniendo información del video: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Método auxiliar para ejecutar comandos con spawn de manera síncrona
  private executeCommand(command: string, args: string[], options: { timeout: number }): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Comando expiró'));
      }, options.timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Comando falló con código: ${code}\nstderr: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // Descargar video y subir a Google Cloud Storage
  async downloadVideo(
    url: string, 
    options: {
      fileName?: string;
      quality?: 'best' | 'worst' | 'bestaudio' | 'bestvideo';
      format?: string;
      audioOnly?: boolean;
      onProgress?: (progress: DownloadProgress) => void;
    } = {}
  ): Promise<DownloadResult> {
    let tempFilePath = '';
    
    try {
      this.validateUrl(url);
      
      // Verificar que yt-dlp esté disponible
      await this.checkYtDlpInstallation();
      
      // Obtener información del video primero
      const videoInfo = await this.getVideoInfo(url);
      
      // Generar nombre de archivo temporal y final
      const tempFileName = options.fileName || this.generateFileName(videoInfo);
      tempFilePath = path.join(this.tempDir, `temp_${Date.now()}_${tempFileName}`);
      
      // Construir argumentos de descarga
      const args = this.buildDownloadArgs(url, tempFilePath, options);
      
      // Ejecutar descarga con progreso
      await this.executeDownloadWithProgress(this.ytDlpPath, args, options.onProgress);
      
      // Verificar que el archivo se descargó correctamente
      if (!fs.existsSync(tempFilePath)) {
        throw new Error('El archivo no se descargó correctamente');
      }

      // Leer el archivo descargado
      const fileBuffer = fs.readFileSync(tempFilePath);
      
      // Determinar tipo de contenido
      const contentType = options.audioOnly ? 'audio/mpeg' : 'video/mp4';
      
      // Generar nombre final para GCS
      const finalFileName = options.fileName || this.generateFileName(videoInfo, options.audioOnly);
      
      this.logger.log(`Subiendo archivo a Google Cloud Storage: ${finalFileName}`);
      
      // Subir a Google Cloud Storage
      const uploadResult: any = await this.googleStorageService.uploadFile(
        this.bucketName,
        fileBuffer,
        contentType,
        finalFileName
      );

      // Limpiar archivo temporal
      this.cleanupTempFile(tempFilePath);

      this.logger.log(`Video subido exitosamente a GCS: ${uploadResult.publicUrl}`);

      return {
        publicUrl: uploadResult.publicUrl,
        fileName: uploadResult.fileName,
        videoInfo,
        bucketName: this.bucketName,
        gcsPath: uploadResult.path
      };
      
    } catch (error) {
      // Limpiar archivo temporal en caso de error
      this.cleanupTempFile(tempFilePath);
      
      this.logger.error(`Error descargando video: ${error.message}`);
      throw new HttpException(
        `Error descargando video: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Descargar solo audio y subir a GCS
  async downloadAudio(url: string, fileName?: string, onProgress?: (progress: DownloadProgress) => void): Promise<DownloadResult> {
    return this.downloadVideo(url, {
      fileName: fileName?.replace('.mp4', '.mp3'),
      audioOnly: true,
      format: 'bestaudio',
      onProgress
    });
  }

  // Descargar playlist y subir cada video a GCS
  async downloadPlaylist(
    url: string, 
    onVideoComplete?: (result: DownloadResult, index: number, total: number) => void,
    onProgress?: (progress: DownloadProgress, videoIndex: number) => void
  ): Promise<{ videos: DownloadResult[] }> {
    try {
      await this.checkYtDlpInstallation();
      
      // Obtener información de la playlist
      const args = ['-j', '--flat-playlist', url];
      const { stdout } = await this.executeCommand(this.ytDlpPath, args, { timeout: 60000 });
      
      const lines = stdout.trim().split('\n');
      const playlistVideos = lines.map(line => JSON.parse(line));
      
      const downloadedVideos: DownloadResult[] = [];
      
      this.logger.log(`Descargando playlist con ${playlistVideos.length} videos`);
      
      // Descargar cada video de la playlist
      for (let i = 0; i < playlistVideos.length; i++) {
        const videoUrl = playlistVideos[i].url || `https://www.youtube.com/watch?v=${playlistVideos[i].id}`;
        
        try {
          this.logger.log(`Descargando video ${i + 1}/${playlistVideos.length}: ${playlistVideos[i].title}`);
          
          const result = await this.downloadVideo(videoUrl, {
            onProgress: (progress) => onProgress?.(progress, i)
          });
          
          downloadedVideos.push(result);
          onVideoComplete?.(result, i, playlistVideos.length);
          
        } catch (error) {
          this.logger.error(`Error descargando video ${i + 1}: ${error.message}`);
          // Continuar con el siguiente video en lugar de fallar toda la playlist
        }
      }
      
      return { videos: downloadedVideos };
      
    } catch (error) {
      throw new HttpException(
        `Error obteniendo playlist: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Eliminar video de Google Cloud Storage
  async deleteVideo(fileName: string): Promise<boolean> {
    try {
      const result = await this.googleStorageService.deleteFile(this.bucketName, fileName);
      return result?.success || false;
    } catch (error) {
      this.logger.error(`Error eliminando video de GCS: ${error.message}`);
      throw new HttpException(
        `Error eliminando video: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Listar todos los videos en el bucket
  async listVideos() {
    try {
      return await this.googleStorageService.listFiles(this.bucketName);
    } catch (error) {
      this.logger.error(`Error listando videos: ${error.message}`);
      throw new HttpException(
        `Error listando videos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private validateUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new Error('URL es requerida');
    }
    
    try {
      new URL(url);
    } catch {
      throw new Error('URL inválida');
    }
  }

  private generateFileName(videoInfo: VideoInfo, isAudio = false): string {
    const sanitizedTitle = videoInfo.title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const extension = isAudio ? 'mp3' : 'mp4';
    return `${sanitizedTitle}_${videoInfo.id}.${extension}`;
  }

  private buildDownloadArgs(
    url: string, 
    filePath: string, 
    options: any
  ): string[] {
    const args: string[] = [];
    
    // Formato de salida
    if (options.audioOnly) {
      args.push('-x', '--audio-format', 'mp3');
    } else {
      args.push('-f', 'best[ext=mp4]/best');
    }
    
    // Calidad específica
    if (options.quality && !options.audioOnly) {
      args.push('-f', options.quality);
    }
    
    // Opciones adicionales
    args.push('--no-warnings', '--newline');
    args.push('-o', filePath);
    args.push(url);
    
    return args;
  }

  private executeDownloadWithProgress(
    command: string, 
    args: string[],
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Ejecutando: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        env: { ...process.env }
      });
      
      child.stdout.on('data', (data) => {
        const output = data.toString();
        this.logger.debug(`yt-dlp stdout: ${output}`);
        
        if (onProgress && output.includes('[download]')) {
          const progress = this.parseProgress(output);
          if (progress) {
            onProgress(progress);
          }
        }
      });
      
      child.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        this.logger.warn(`yt-dlp stderr: ${errorOutput}`);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          this.logger.log('Descarga completada exitosamente');
          resolve();
        } else {
          this.logger.error(`yt-dlp falló con código: ${code}`);
          reject(new Error(`yt-dlp falló con código: ${code}`));
        }
      });
      
      child.on('error', (error) => {
        this.logger.error(`Error ejecutando yt-dlp: ${error.message}`);
        reject(new Error(`Error ejecutando yt-dlp: ${error.message}`));
      });
    });
  }

  private parseProgress(output: string): DownloadProgress | null {
    const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
    if (!progressMatch) return null;
    
    const percent = parseFloat(progressMatch[1]);
    const speedMatch = output.match(/at\s+([\d.]+\w+\/s)/);
    const etaMatch = output.match(/ETA\s+([\d:]+)/);
    
    return {
      percent,
      speed: speedMatch ? speedMatch[1] : undefined,
      eta: etaMatch ? etaMatch[1] : undefined
    };
  }

  // Limpiar archivo temporal
  private cleanupTempFile(filePath: string): void {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        this.logger.debug(`Archivo temporal eliminado: ${filePath}`);
      } catch (error) {
        this.logger.warn(`No se pudo eliminar archivo temporal: ${filePath} - ${error.message}`);
      }
    }
  }

  // Limpiar archivos temporales antiguos
  async cleanOldTempFiles(daysOld: number = 1): Promise<void> {
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    try {
      const files = fs.readdirSync(this.tempDir);
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtimeMs < cutoffDate) {
          fs.unlinkSync(filePath);
          this.logger.log(`Archivo temporal eliminado: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error limpiando archivos temporales: ${error.message}`);
    }
  }
}