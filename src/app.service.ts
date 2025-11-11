import { Injectable, Res } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { analizarDatosTikTok, obtenerInsightsParaIA } from './apify/util/dataAnaliticsWhitInsigth';
import { VideoDownloaderService } from './apify/downloaderVideo/downloadFile';
import { GoogleVideoIntelligenceService } from './googleAi/google-video-intelligence.service';
import { VideoAnalysisDto } from './googleAi/dto/googleDto';
import { GoogleAIService } from './googleAi/iaLenguageGeneta';
import { prompsSystem } from './googleAi/util/promps';
import { analizarDatosCompetidoresTikTok, obtenerInsightsCompetidores } from './apify/util/analiticcCompetitors';



@Injectable()
export class AppService {
  constructor(
    private readonly videoDownloaderService: VideoDownloaderService,
    private readonly googleVideoService: GoogleVideoIntelligenceService,
    private readonly googleAI: GoogleAIService
  ) { }
  async getHello(): Promise<any> {

    const videoUrl = "gs://archivosvideos/video.mp4" //"";
    const analysisDto: VideoAnalysisDto = {
      videoUrl,
    };


    // const resultN = await this.googleVideoService.analyzeVideo(analysisDto);

    console.log("analisando",)


    // 🎥 OPCIÓN 1: Descargar video completo
    console.log('🚀 Iniciando descarga de video...');

    /*const downloadResult = await this.videoDownloaderService.downloadVideo("https://www.tiktok.com/@jhonanderson639/video/7244920758097497350", {
      quality: 'worst', // 'best' | 'worst' | 'bestaudio' | 'bestvideo'
      fileName: 'mi_video_tiktok.mp4', // Opcional, si no se proporciona se genera automáticamente
      onProgress: (progress) => {
        // Callback para mostrar progreso de descarga
        console.log(`📥 Descargando: ${progress.percent.toFixed(1)}% - Velocidad: ${progress.speed || 'N/A'} - ETA: ${progress.eta || 'N/A'}`);
      }
    });

    console.log('✅ Video descargado exitosamente!');
    console.log('📁 Archivo guardado en:', downloadResult.filePath);
    console.log('📝 Nombre del archivo:', downloadResult.fileName);

    const report = {
      downloadSuccess: true,
      videoInfo: {
        title: downloadResult.videoInfo.title,
        uploader: downloadResult.videoInfo.uploader,
        durationInSeconds: downloadResult.videoInfo.duration,
        viewCount: downloadResult.videoInfo.view_count,
        likeCount: downloadResult.videoInfo.like_count,
        uploadDate: downloadResult.videoInfo.upload_date
      },
      downloadDetails: {
        filePath: downloadResult.filePath,
        fileName: downloadResult.fileName,
        downloadedAt: new Date().toISOString()
      }
    };*/
    console.log("result",)
    const filePath = path.join(process.cwd(), 'example.json');
    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
    
    const result = analizarDatosCompetidoresTikTok(fileContent.data);
 //@ts-ignore
    const res = obtenerInsightsCompetidores(result)

    
    const resultadoAnalisis = `
    
    ${JSON.stringify(res)}
    este es un analisis del video 
    {
  "analisis": {
    "labels": [
      {
        "entity": "leg",
        "categoryEntities": [
          "human body"
        ],
        "confidence": 0.532664656639099,
        "segments": [
          {
            "startTime": "0.0s",
            "endTime": "8.66s"
          }
        ]
      },
      {
        "entity": "dance",
        "categoryEntities": [
          "event"
        ],
        "confidence": 0.803750574588776,
        "segments": [
          {
            "startTime": "0.0s",
            "endTime": "8.66s"
          }
        ]
      },
      {
        "entity": "song",
        "categoryEntities": [
          "music"
        ],
        "confidence": 0.319173723459244,
        "segments": [
          {
            "startTime": "0.0s",
            "endTime": "8.66s"
          }
        ]
      }
    ],
    "speechTranscriptions": [],
    "shotChanges": [
      {
        "startTime": "0.0s",
        "endTime": "1.83s"
      },
      {
        "startTime": "1.100s",
        "endTime": "3.100s"
      },
      {
        "startTime": "3.116s",
        "endTime": "5.66s"
      },
      {
        "startTime": "5.83s",
        "endTime": "7.100s"
      },
      {
        "startTime": "7.116s",
        "endTime": "8.66s"
      }
    ],
    "processingTime": 55453,
    "videoUri": "gs://archivosvideos/video.mp4"
  },
  "ia": "results"
}
    `

    const results = await this.googleAI.generateText({
      prompt: resultadoAnalisis,
      systemInstruction: prompsSystem,
    });
    return { analisis: "resultN", ia: results };
  }
}
