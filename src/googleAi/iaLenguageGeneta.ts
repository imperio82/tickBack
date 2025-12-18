// google-ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/**
 * Modelos de Gemini disponibles en la API
 */
export type GeminiModel =
  | 'gemini-pro-latest'
  | 'gemini-flash-latest'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.0-flash';

export const GEMINI_MODELS: readonly GeminiModel[] = [
  'gemini-pro-latest',
  'gemini-flash-latest',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
] as const;

export interface GenerateTextDto {
  prompt: string;
  model?: GeminiModel;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

export interface GenerateResponse {
  text: string;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface ConversationMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GenerateConversationDto {
  messages: ConversationMessage[];
  model?: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

@Injectable()
export class GoogleAIService {
  private readonly logger = new Logger(GoogleAIService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is required in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Obtiene o crea un modelo con configuración específica
   */
  private getModel(modelName: string, systemInstruction?: string): GenerativeModel {
    const modelConfig: any = { model: modelName };
    
    if (systemInstruction) {
      modelConfig.systemInstruction = systemInstruction;
    }

    return this.genAI.getGenerativeModel(modelConfig);
  }

  /**
   * Retry helper con exponential backoff para rate limits
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Verificar si es un error de rate limit (429)
        const is429Error = error.message?.includes('429') ||
                          error.message?.includes('quota') ||
                          error.message?.includes('Too Many Requests');

        if (!is429Error || attempt === maxRetries) {
          throw error;
        }

        // Extraer tiempo de espera sugerido del mensaje de error
        const retryMatch = error.message.match(/retry in ([\d.]+)s/i);
        const suggestedDelay = retryMatch ? parseFloat(retryMatch[1]) * 1000 : null;

        // Usar el delay sugerido o exponential backoff
        const delay = suggestedDelay || initialDelay * Math.pow(2, attempt);

        this.logger.warn(
          `Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}). ` +
          `Retrying in ${Math.round(delay / 1000)}s...`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Genera texto usando el modelo especificado con soporte para system instructions
   */
  async generateText(dto: GenerateTextDto): Promise<GenerateResponse> {
    return this.retryWithBackoff(async () => {
      try {
        const {
          prompt,
          model = 'gemini-flash-latest',
          systemInstruction,
          ...options
        } = dto;

        this.logger.log(`Generating text with model: ${model}`);

        const generativeModel = this.getModel(model, systemInstruction);

        // Configurar parámetros de generación
        const generationConfig = {
          temperature: options.temperature ?? 0.7,
          topK: options.topK ?? 40,
          topP: options.topP ?? 0.95,
          maxOutputTokens: options.maxOutputTokens ?? 1024,
        };

        const result = await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        });

        const response = await result.response;
        const text = response.text();

        // Extraer información de uso de tokens si está disponible
        const usage = response.usageMetadata ? {
          promptTokenCount: response.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
          totalTokenCount: response.usageMetadata.totalTokenCount || 0,
        } : undefined;

        return {
          text,
          usage,
        };

      } catch (error) {
        this.logger.error('Error generating text:', error.message);
        throw new Error(`Failed to generate text: ${error.message}`);
      }
    });
  }

  /**
   * Genera texto con imágenes usando gemini-pro-vision
   */
  async generateTextWithImage(
    prompt: string, 
    imageData: string | Buffer, 
    mimeType: string = 'image/jpeg',
    systemInstruction?: string
  ): Promise<GenerateResponse> {
    try {
      this.logger.log('Generating text with image using gemini-pro-vision');
      
      const model = this.getModel('gemini-pro-vision', systemInstruction);

      // Convertir imagen a base64 si es necesario
      const imageBase64 = Buffer.isBuffer(imageData) 
        ? imageData.toString('base64')
        : imageData;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      const usage = response.usageMetadata ? {
        promptTokenCount: response.usageMetadata.promptTokenCount || 0,
        candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
        totalTokenCount: response.usageMetadata.totalTokenCount || 0,
      } : undefined;

      return {
        text,
        usage,
      };

    } catch (error) {
      this.logger.error('Error generating text with image:', error.message);
      throw new Error(`Failed to generate text with image: ${error.message}`);
    }
  }

  /**
   * Genera múltiples candidatos de respuesta
   */
  async generateMultipleCandidates(
    prompt: string,
    candidateCount: number = 3,
    model: string = 'gemini-flash-latest',
    systemInstruction?: string
  ): Promise<string[]> {
    try {
      this.logger.log(`Generating ${candidateCount} candidates with model: ${model}`);
      
      const generativeModel = this.getModel(model, systemInstruction);

      const result = await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          candidateCount,
          temperature: 0.8,
        },
      });

      const response = await result.response;
      const candidates = response.candidates || [];
      
      return candidates.map(candidate => 
        candidate.content?.parts?.[0]?.text || ''
      ).filter(text => text.length > 0);

    } catch (error) {
      this.logger.error('Error generating multiple candidates:', error.message);
      throw new Error(`Failed to generate multiple candidates: ${error.message}`);
    }
  }

  /**
   * Genera conversación con historial y soporte para system instructions
   */
  async generateConversation(dto: GenerateConversationDto): Promise<GenerateResponse> {
    try {
      const {
        messages,
        model = 'gemini-flash-latest',
        systemInstruction,
        ...options
      } = dto;

      this.logger.log(`Starting conversation with model: ${model}`);
      
      const generativeModel = this.getModel(model, systemInstruction);

      // Convertir mensajes al formato requerido
      const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      // Configurar parámetros de generación
      const generationConfig = {
        temperature: options.temperature ?? 0.7,
        topK: options.topK ?? 40,
        topP: options.topP ?? 0.95,
        maxOutputTokens: options.maxOutputTokens ?? 1024,
      };

      const result = await generativeModel.generateContent({
        contents,
        generationConfig,
      });

      const response = await result.response;
      const text = response.text();

      const usage = response.usageMetadata ? {
        promptTokenCount: response.usageMetadata.promptTokenCount || 0,
        candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
        totalTokenCount: response.usageMetadata.totalTokenCount || 0,
      } : undefined;

      return {
        text,
        usage,
      };

    } catch (error) {
      this.logger.error('Error in conversation:', error.message);
      throw new Error(`Failed to generate conversation: ${error.message}`);
    }
  }

  /**
   * Crea una sesión de chat con historial persistente
   */
  async startChatSession(
    model: string = 'gemini-flash-latest',
    systemInstruction?: string,
    history?: ConversationMessage[]
  ) {
    try {
      const generativeModel = this.getModel(model, systemInstruction);
      
      // Convertir historial al formato requerido si existe
      const formattedHistory = history ? history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })) : [];

      const chat = generativeModel.startChat({
        history: formattedHistory,
      });

      return {
        sendMessage: async (message: string): Promise<GenerateResponse> => {
          try {
            const result = await chat.sendMessage(message);
            const response = await result.response;
            const text = response.text();

            const usage = response.usageMetadata ? {
              promptTokenCount: response.usageMetadata.promptTokenCount || 0,
              candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
              totalTokenCount: response.usageMetadata.totalTokenCount || 0,
            } : undefined;

            return { text, usage };
          } catch (error) {
            this.logger.error('Error sending message in chat:', error.message);
            throw new Error(`Failed to send message: ${error.message}`);
          }
        },
        getHistory: () => chat.getHistory(),
      };

    } catch (error) {
      this.logger.error('Error starting chat session:', error.message);
      throw new Error(`Failed to start chat session: ${error.message}`);
    }
  }

  /**
   * Cuenta tokens de un texto
   */
  async countTokens(
    text: string,
    model: string = 'gemini-flash-latest',
    systemInstruction?: string
  ): Promise<number> {
    try {
      const generativeModel = this.getModel(model, systemInstruction);
      const result = await generativeModel.countTokens(text);
      return result.totalTokens;

    } catch (error) {
      this.logger.error('Error counting tokens:', error.message);
      throw new Error(`Failed to count tokens: ${error.message}`);
    }
  }

  /**
   * Obtiene información sobre los modelos disponibles
   */
  getAvailableModels(): GeminiModel[] {
    return [...GEMINI_MODELS];
  }

  /**
   * Verifica si un modelo está disponible
   */
  isModelAvailable(modelName: string): boolean {
    return this.getAvailableModels().includes(modelName as GeminiModel);
  }
}