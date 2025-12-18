import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as crypto from 'crypto';


@Injectable()
export class GoogleStorageService {
  private storage: Storage;
  private readonly logger = new Logger(GoogleStorageService.name);

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const privateKey = this.configService.get<string>('GOOGLE_CLOUD_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('GOOGLE_CLOUD_CLIENT_EMAIL');

    if (!projectId || !privateKey || !clientEmail) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_PRIVATE_KEY o GOOGLE_CLOUD_CLIENT_EMAIL no está definido');
    }

    // Configurar credenciales desde variables de entorno
    const credentials = {
      type: 'service_account',
      project_id: projectId,
      private_key: privateKey.replace(/\\n/g, '\n'), // Reemplazar \n literales con saltos de línea reales
      client_email: clientEmail,
    };

    this.storage = new Storage({
      projectId,
      credentials,
    });

    this.logger.log('GoogleStorageService inicializado correctamente');
  }

  /**
   * Obtiene el cliente de Google Storage para operaciones directas
   */
  getClient(): Storage {
    return this.storage;
  }

  /**
   * Sube un archivo a Google Cloud Storage
   * @param bucketName Nombre del bucket donde se almacenará
   * @param file Buffer del archivo a subir
   * @param contentType Tipo MIME del archivo (ej. 'image/jpeg')
   * @param fileName Nombre opcional para el archivo (si es null, se genera uno aleatorio)
   * @returns Información del archivo subido o error
   */
  async uploadFile(
    bucketName: string,
    file: Buffer,
    contentType: string,
    fileName?: string,
  ) {
    try {
      this.logger.debug(`Iniciando uploadFile al bucket: "${bucketName}"`);

      // Generar un nombre de archivo único si no se proporciona uno
      let fileNameToUse = fileName;
      if (!fileNameToUse) {
        const extension = this.getExtensionFromMimeType(contentType);
        fileNameToUse = `${crypto.randomUUID()}.${extension}`;
      }

      this.logger.debug(`Nombre del archivo a subir: ${fileNameToUse}`);

      const bucket = this.storage.bucket(bucketName);

      // Verificar si el bucket existe, si no, crearlo
      const [bucketExists] = await bucket.exists();
      if (!bucketExists) {
        this.logger.warn(`Bucket "${bucketName}" no encontrado, intentando crearlo...`);
        
        await this.storage.createBucket(bucketName, {
          location: 'US', // Puedes cambiar la ubicación según tus necesidades
          storageClass: 'STANDARD',
        });

        // Hacer el bucket público para lectura
        await bucket.iam.setPolicy({
          bindings: [
            {
              role: 'roles/storage.objectViewer',
              members: ['allUsers'],
            },
          ],
        });

        this.logger.log(`Bucket "${bucketName}" creado exitosamente`);
      }

      // Subir el archivo
      const fileRef = bucket.file(fileNameToUse);
      
      const stream = fileRef.createWriteStream({
        metadata: {
          contentType,
        },
        resumable: false,
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          this.logger.error(`Error subiendo archivo: ${error.message}`, error.stack);
          reject(error);
        });

        stream.on('finish', () => {
          // El archivo es público automáticamente gracias a la política IAM del bucket
          // No se usa makePublic() para ser compatible con Uniform Bucket-Level Access
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileNameToUse}`;
          const gcsUri = `gs://${bucketName}/${fileNameToUse}`;

          resolve({
            path: fileNameToUse,
            publicUrl: publicUrl,
            gcsUri: gcsUri,
            fileName: fileNameToUse,
            bucketName: bucketName,
          });
        });

        stream.end(file);
      });

    } catch (error) {
      this.logger.error(
        `Error en Google Storage uploadFile: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Elimina un archivo de Google Cloud Storage
   * @param bucketName Nombre del bucket
   * @param fileName Nombre del archivo a eliminar
   * @returns Resultado de la operación
   */
  async deleteFile(bucketName: string, fileName: string) {
    try {
      if (!fileName) {
        this.logger.warn('Se intentó eliminar un archivo sin proporcionar nombre');
        return null;
      }

      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(fileName);

      // Verificar si el archivo existe
      const [exists] = await file.exists();
      if (!exists) {
        this.logger.warn(`Archivo "${fileName}" no encontrado en bucket "${bucketName}"`);
        return null;
      }

      await file.delete();
      this.logger.debug(`Archivo "${fileName}" eliminado exitosamente`);
      
      return { success: true, fileName };

    } catch (error) {
      this.logger.error(
        `Error en Google Storage deleteFile: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene la URL pública de un archivo
   * @param bucketName Nombre del bucket
   * @param fileName Nombre del archivo
   * @returns URL pública del archivo
   */
  getPublicUrl(bucketName: string, fileName: string): string | null {
    try {
      if (!fileName) {
        return null;
      }

      return `https://storage.googleapis.com/${bucketName}/${fileName}`;
    } catch (error) {
      this.logger.error(
        `Error en Google Storage getPublicUrl: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene la información de un archivo
   * @param bucketName Nombre del bucket
   * @param fileName Nombre del archivo
   * @returns Metadata del archivo
   */
  async getFileMetadata(bucketName: string, fileName: string) {
    try {
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(fileName);

      const [metadata] = await file.getMetadata();
      return metadata;
    } catch (error) {
      this.logger.error(
        `Error obteniendo metadata: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lista todos los archivos en un bucket
   * @param bucketName Nombre del bucket
   * @returns Lista de archivos
   */
  async listFiles(bucketName: string) {
    try {
      const bucket = this.storage.bucket(bucketName);
      const [files] = await bucket.getFiles();

      return files.map(file => ({
        name: file.name,
        publicUrl: this.getPublicUrl(bucketName, file.name),
      }));
    } catch (error) {
      this.logger.error(
        `Error listando archivos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene la extensión de archivo basada en el tipo MIME
   * @param mimeType Tipo MIME del archivo
   * @returns Extensión del archivo
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeTypeMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/json': 'json',
      'text/csv': 'csv',
    };

    return mimeTypeMap[mimeType] || 'bin';
  }
}