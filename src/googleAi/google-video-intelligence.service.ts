// src/services/google-video-intelligence.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
import { VideoAnalysisDto } from './dto/googleDto';
import { VideoAnalysisResult, LabelDetection, SpeechTranscription, ShotChange } from './dto/googleDto';
import { protos } from '@google-cloud/video-intelligence';

// Tipos necesarios
type IAnnotateVideoRequest = protos.google.cloud.videointelligence.v1.IAnnotateVideoRequest;
type Feature = protos.google.cloud.videointelligence.v1.Feature;


@Injectable()
export class GoogleVideoIntelligenceService {
  private readonly logger = new Logger(GoogleVideoIntelligenceService.name);
  private client: VideoIntelligenceServiceClient;

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const privateKey = this.configService.get<string>('GOOGLE_CLOUD_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('GOOGLE_CLOUD_CLIENT_EMAIL');

    // Configurar credenciales desde variables de entorno
    const credentials = {
      type: 'service_account',
      project_id: projectId,
      private_key: privateKey?.replace(/\\n/g, '\n'), // Reemplazar \n literales con saltos de línea reales
      client_email: clientEmail,
    };

    this.client = new VideoIntelligenceServiceClient({
      projectId,
      credentials,
    });
  }

 
async analyzeVideo(videoAnalysisDto: VideoAnalysisDto): Promise<VideoAnalysisResult> {
  const startTime = Date.now();
  
  try {
    this.logger.log(`Iniciando análisis de video: ${videoAnalysisDto.videoUrl}`);
    
    // Corregir el tipo de features usando el enum correcto
    const request: IAnnotateVideoRequest = {
      inputUri: videoAnalysisDto.videoUrl,
      features: [
        protos.google.cloud.videointelligence.v1.Feature.LABEL_DETECTION,
        protos.google.cloud.videointelligence.v1.Feature.SPEECH_TRANSCRIPTION,
        protos.google.cloud.videointelligence.v1.Feature.SHOT_CHANGE_DETECTION,
      ],
      videoContext: {
        speechTranscriptionConfig: {
          languageCode: 'es-ES',
          enableAutomaticPunctuation: true,
          enableWordConfidence : true,
          enableSpeakerDiarization: true,
          diarizationSpeakerCount: 2,
        },
        labelDetectionConfig: {
          labelDetectionMode: 'SHOT_AND_FRAME_MODE',
          stationaryCamera: false,
        },
      },
    };

    // Corregir el destructuring de la operación
    const [operation] = await this.client.annotateVideo(request);
    this.logger.log('Operación iniciada, esperando resultados...');
    
    // Corregir el manejo de la promesa de la operación
    const [operationResult] = await operation.promise();
    const processingTime = Date.now() - startTime;
    
    const result: VideoAnalysisResult = {
      labels: this.processLabels(operationResult.annotationResults?.[0]?.segmentLabelAnnotations || []),
      speechTranscriptions: this.processSpeechTranscriptions(operationResult.annotationResults?.[0]?.speechTranscriptions || []),
      shotChanges: this.processShotChanges(operationResult.annotationResults?.[0]?.shotAnnotations || []),
      processingTime,
      videoUri: videoAnalysisDto.videoUrl,
    };
    
    this.logger.log(`Análisis completado en ${processingTime}ms`);
    return result;
    
  } catch (error) {
    this.logger.error('Error en análisis de video:', error);
    throw new Error(`Error analizando video: ${error.message}`);
  }
}
  private processLabels(labelAnnotations: any[]): LabelDetection[] {
    return labelAnnotations.map(label => ({
      entity: label.entity?.description || '',
      categoryEntities: label.categoryEntities?.map(cat => cat.description) || [],
      confidence: label.segments?.[0]?.confidence || 0,
      segments: label.segments?.map(segment => ({
        startTime: this.formatTime(segment.segment?.startTimeOffset),
        endTime: this.formatTime(segment.segment?.endTimeOffset),
      })) || [],
    }));
  }

  private processSpeechTranscriptions(speechTranscriptions: any[]): SpeechTranscription[] {
    return speechTranscriptions.map(transcription => ({
      alternatives: transcription.alternatives?.map(alt => ({
        transcript: alt.transcript || '',
        confidence: alt.confidence || 0,
        words: alt.words?.map(word => ({
          word: word.word || '',
          startTime: this.formatTime(word.startTime),
          endTime: this.formatTime(word.endTime),
          speakerTag: word.speakerTag,
        })) || [],
      })) || [],
      languageCode: transcription.languageCode || 'es-ES',
    }));
  }

  private processShotChanges(shotAnnotations: any[]): ShotChange[] {
    return shotAnnotations.map(shot => ({
      startTime: this.formatTime(shot.startTimeOffset),
      endTime: this.formatTime(shot.endTimeOffset),
    }));
  }

  private formatTime(timeOffset: any): string {
    if (!timeOffset) return '0s';
    const seconds = parseInt(timeOffset.seconds || 0);
    const nanos = parseInt(timeOffset.nanos || 0);
    return `${seconds}.${Math.floor(nanos / 1000000)}s`;
  }

  async getAnalysisCost(videoDuration: number): Promise<number> {
    // Precios aproximados de Google Cloud Video Intelligence (por minuto)
    const labelDetectionCost = 0.10; // $0.10 per minute
    const speechTranscriptionCost = 0.048; // $0.048 per minute
    const shotDetectionCost = 0.05; // $0.05 per minute
    
    const totalCostPerMinute = labelDetectionCost + speechTranscriptionCost + shotDetectionCost;
    const durationInMinutes = Math.ceil(videoDuration / 60);
    
    return totalCostPerMinute * durationInMinutes;
  }
}