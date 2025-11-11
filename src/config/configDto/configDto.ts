import { SectorEconomico, TipoProducto } from "src/user/dto/enums";
import {  } from "src/user/user.Entity/user.Entity";

// DTO para configuración
export class ConfiguracionAnalisisDto {
  pais: string;
  region?: string;
  ciudad?: string;
  idiomaPrincipal: string;
  sectorEconomico: SectorEconomico;
  tipoProducto: TipoProducto;
  nombreProducto?: string;
  descripcionProducto?: string;
  palabrasClave?: string[];
  hashtags?: string[];
  competidores?: string[];
  maxResultados?: number;
  diasAnalisis?: number;
  minVisualizaciones?: number;
  incluirComentarios?: boolean;
}

// DTO para configuración de Apify
export class ConfiguracionApifyDto {
  apifyToken: string;
  maxResultados: number;
  diasAnalisis: number;
  incluirComentarios: boolean;
  maxComentariosPorVideo: number;
  analizarPerfil: boolean;
  soloVerificados: boolean;
}