//@ts-nocheck
// Tipos para la nueva estructura de datos de competidores
export interface TikTokCompetitorVideoData {
  "authorMeta.avatar": string;
  "authorMeta.name": string;
  text: string;
  diggCount: number;
  shareCount: number;
  playCount: number;
  commentCount: number;
  collectCount: number;
  "videoMeta.duration": number;
  "musicMeta.musicName": string;
  "musicMeta.musicAuthor": string;
  "musicMeta.musicOriginal": boolean;
  createTimeISO: string;
  webVideoUrl: string;
  // Campos adicionales que podrían existir
  hashtags?: string[];
  id?: string;
}

export interface CompetitorAnalysisResult {
  resumen: {
    totalVideos: number;
    videosConLikes: number;
    videosConComentarios: number;
    videosConShares: number;
  };
  top5PorVistas: {
    titulo: string;
    videos: any[];
  };
  top5EngagementOptimo: {
    titulo: string;
    descripcion: string;
    videosCompletos: any[];
    videosResumen: any[];
  };
  top5PorLikes: {
    titulo: string;
    totalConLikes: number;
    videos: any[];
  };
  top5PorComentarios: {
    titulo: string;
    totalConComentarios: number;
    videos: any[];
  };
  top5PorShares: {
    titulo: string;
    totalConShares: number;
    videos: any[];
  };
  analisisCompetidores: {
    patronesMusica: any;
    patronesDuracion: any;
    patronesTexto: any;
    analisisPorAutor: any;
  };
  estadisticasGenerales: {
    promedioVistas: number;
    promedioLikes: number;
    promedioComentarios: number;
    promedioShares: number;
  };
}

export function analizarDatosCompetidoresTikTok(data: any): CompetitorAnalysisResult | { error: string } {
  // Verificar que tengamos datos válidos
  if (!data || !Array.isArray(data)) {
    return {
      error: "Datos inválidos o no encontrados. Se esperaba un array de videos."
    };
  }

  const videos: TikTokCompetitorVideoData[] = data;

  if (videos.length === 0) {
    return {
      error: "No se encontraron videos para analizar"
    };
  }

  // 1. FILTRAR Y ORDENAR POR VISTAS (playCount)
  const videosPorVistas = [...videos].sort((a, b) => b.playCount - a.playCount);
  const top5PorVistas = videosPorVistas.slice(0, 5);

  // 2. ANÁLISIS POR LIKES + ENGAGEMENT COMBINADO
  const videosConLikes = videos.filter(video => video.diggCount > 0);
  const videosPorLikes = videosConLikes.sort((a, b) => b.diggCount - a.diggCount);
  
  // Tomar top 10 por likes para luego filtrar por engagement
  const top10PorLikes = videosPorLikes.slice(0, 10);
  
  // Del top 10 por likes, ordenar por engagement total (comentarios + shares)
  const videosPorEngagement = top10PorLikes.sort((a, b) => {
    const engagementA = a.commentCount + a.shareCount;
    const engagementB = b.commentCount + b.shareCount;
    return engagementB - engagementA;
  });
  
  const top5EngagementOptimo = videosPorEngagement.slice(0, 5);

  // 3. FILTRAR Y ORDENAR POR COMENTARIOS
  const videosConComentarios = videos.filter(video => video.commentCount > 0);
  const videosPorComentarios = videosConComentarios.sort((a, b) => b.commentCount - a.commentCount);
  const top5PorComentarios = videosPorComentarios.slice(0, 5);

  // 4. FILTRAR Y ORDENAR POR SHARES
  const videosConShares = videos.filter(video => video.shareCount > 0);
  const videosPorShares = videosConShares.sort((a, b) => b.shareCount - a.shareCount);
  const top5PorShares = videosPorShares.slice(0, 5);

  // Función para formatear video completo para análisis de IA
  function formatearVideoCompetidorParaIA(video: TikTokCompetitorVideoData) {
    return {
      id: video.id || video.webVideoUrl,
      texto: video.text || '',
      textoCompleto: video.text || '',
      vistas: video.playCount || 0,
      likes: video.diggCount || 0,
      comentarios: video.commentCount || 0,
      compartidos: video.shareCount || 0,
      saves: video.collectCount || 0,
      duracion: video["videoMeta.duration"] || 0,
      fecha: video.createTimeISO,
      webVideoUrl: video.webVideoUrl,
      
      // Información multimedia adaptada a la nueva estructura
      multimedia: {
        webVideoUrl: video.webVideoUrl || null,
        
        // Información de música
        musica: {
          nombre: video["musicMeta.musicName"] || null,
          autor: video["musicMeta.musicAuthor"] || null,
          esOriginal: video["musicMeta.musicOriginal"] || false
        }
      },
      
      // Métricas de engagement calculadas
      metricas: {
        engagementTotal: (video.commentCount || 0) + (video.shareCount || 0) + (video.diggCount || 0),
        tasaEngagement: video.playCount > 0 ? 
          (((video.commentCount || 0) + (video.shareCount || 0) + (video.diggCount || 0)) / video.playCount * 100).toFixed(2) : "0",
        tasaLikes: video.playCount > 0 ? ((video.diggCount || 0) / video.playCount * 100).toFixed(2) : "0",
        tasaComentarios: video.playCount > 0 ? ((video.commentCount || 0) / video.playCount * 100).toFixed(2) : "0",
        tasaShares: video.playCount > 0 ? ((video.shareCount || 0) / video.playCount * 100).toFixed(2) : "0",
        tasaSaves: video.playCount > 0 ? ((video.collectCount || 0) / video.playCount * 100).toFixed(2) : "0"
      },
      
      // Información del autor/competidor
      autor: {
        nombre: video["authorMeta.name"] || '',
        avatar: video["authorMeta.avatar"] || null
      }
    };
  }

  // Función para formatear resumen de video
  function formatearVideoCompetidorResumen(video: TikTokCompetitorVideoData) {
    return {
      id: video.id || video.webVideoUrl,
      autor: video["authorMeta.name"] || '',
      texto: video.text?.substring(0, 100) + (video.text && video.text.length > 100 ? '...' : ''),
      vistas: video.playCount || 0,
      likes: video.diggCount || 0,
      comentarios: video.commentCount || 0,
      compartidos: video.shareCount || 0,
      saves: video.collectCount || 0,
      duracion: video["videoMeta.duration"] || 0,
      fecha: video.createTimeISO,
      webVideoUrl: video.webVideoUrl,
      engagementTotal: (video.commentCount || 0) + (video.shareCount || 0) + (video.diggCount || 0),
      musica: {
        nombre: video["musicMeta.musicName"] || '',
        autor: video["musicMeta.musicAuthor"] || '',
        esOriginal: video["musicMeta.musicOriginal"] || false
      }
    };
  }

  // Preparar resultado final
  const resultado: CompetitorAnalysisResult = {
    resumen: {
      totalVideos: videos.length,
      videosConLikes: videosConLikes.length,
      videosConComentarios: videosConComentarios.length,
      videosConShares: videosConShares.length
    },
    
    top5PorVistas: {
      titulo: "Top 5 Videos de Competidores con Más Vistas",
      videos: top5PorVistas.map(formatearVideoCompetidorResumen)
    },
    
    top5EngagementOptimo: {
      titulo: "Top 5 Videos de Competidores con Mejor Engagement",
      descripcion: "Videos con más likes que también tienen alto engagement (comentarios + shares)",
      videosCompletos: top5EngagementOptimo.map(formatearVideoCompetidorParaIA),
      videosResumen: top5EngagementOptimo.map(formatearVideoCompetidorResumen)
    },
    
    top5PorLikes: {
      titulo: "Top 5 Videos de Competidores con Más Likes",
      totalConLikes: videosConLikes.length,
      videos: videosPorLikes.slice(0, 5).map(formatearVideoCompetidorResumen)
    },
    
    top5PorComentarios: {
      titulo: "Top 5 Videos de Competidores con Más Comentarios",
      totalConComentarios: videosConComentarios.length,
      videos: top5PorComentarios.map(formatearVideoCompetidorResumen)
    },
    
    top5PorShares: {
      titulo: "Top 5 Videos de Competidores con Más Compartidos",
      totalConShares: videosConShares.length,
      videos: top5PorShares.map(formatearVideoCompetidorResumen)
    },
    
    // Análisis específico para competidores
    analisisCompetidores: {
      patronesMusica: analizarPatronesMusicaCompetidores(top5EngagementOptimo),
      patronesDuracion: analizarPatronesDuracionCompetidores(top5EngagementOptimo),
      patronesTexto: analizarPatronesTextoCompetidores(top5EngagementOptimo),
      analisisPorAutor: analizarPorAutorCompetidores(videos)
    },
    
    estadisticasGenerales: {
      promedioVistas: Math.round(videos.reduce((sum, v) => sum + (v.playCount || 0), 0) / videos.length),
      promedioLikes: Math.round(videos.reduce((sum, v) => sum + (v.diggCount || 0), 0) / videos.length),
      promedioComentarios: Math.round(videos.reduce((sum, v) => sum + (v.commentCount || 0), 0) / videos.length),
      promedioShares: Math.round(videos.reduce((sum, v) => sum + (v.shareCount || 0), 0) / videos.length)
    }
  };

  return resultado;
}

// Función para analizar patrones de música de competidores
function analizarPatronesMusicaCompetidores(videos: TikTokCompetitorVideoData[]) {
  const musicaOriginal = videos.filter(v => v["musicMeta.musicOriginal"] === true);
  const musicaNoOriginal = videos.filter(v => v["musicMeta.musicOriginal"] === false);
  
  const artistasPopulares: { [key: string]: number } = {};
  const cancionesPopulares: { [key: string]: number } = {};
  
  videos.forEach(video => {
    const autor = video["musicMeta.musicAuthor"];
    const cancion = video["musicMeta.musicName"];
    
    if (autor) {
      artistasPopulares[autor] = (artistasPopulares[autor] || 0) + 1;
    }
    
    if (cancion) {
      cancionesPopulares[cancion] = (cancionesPopulares[cancion] || 0) + 1;
    }
  });

  return {
    porcentajeMusicaOriginal: videos.length > 0 ? ((musicaOriginal.length / videos.length) * 100).toFixed(1) : "0",
    porcentajeMusicaNoOriginal: videos.length > 0 ? ((musicaNoOriginal.length / videos.length) * 100).toFixed(1) : "0",
    artistasMasUsados: Object.entries(artistasPopulares)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artista, count]) => ({ artista, frecuencia: count })),
    cancionesMasUsadas: Object.entries(cancionesPopulares)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cancion, count]) => ({ cancion, frecuencia: count })),
    recomendacionMusica: musicaOriginal.length > musicaNoOriginal.length ? 
      "Los competidores usan más música original" : "Los competidores usan más música trending/popular"
  };
}

// Función para analizar patrones de duración de competidores
function analizarPatronesDuracionCompetidores(videos: TikTokCompetitorVideoData[]) {
  const duraciones = videos.map(v => v["videoMeta.duration"]).filter(d => d && d > 0);
  const promedio = duraciones.length > 0 ? 
    (duraciones.reduce((a, b) => a + b, 0) / duraciones.length).toFixed(1) : "0";
  
  const cortos = duraciones.filter(d => d <= 15).length;
  const medios = duraciones.filter(d => d > 15 && d <= 30).length;
  const largos = duraciones.filter(d => d > 30).length;
  
  let recomendacion = "Analizar más videos para determinar tendencia";
  if (cortos > medios + largos) {
    recomendacion = "Los competidores prefieren videos cortos (≤15s)";
  } else if (medios > cortos + largos) {
    recomendacion = "Los competidores prefieren videos medianos (15-30s)";
  } else if (largos > cortos + medios) {
    recomendacion = "Los competidores prefieren videos largos (>30s)";
  }
  
  return {
    duracionPromedio: promedio + " segundos",
    distribucion: {
      cortos: `${cortos} videos (≤15s)`,
      medios: `${medios} videos (15-30s)`,
      largos: `${largos} videos (>30s)`
    },
    recomendacion
  };
}

// Función para analizar patrones de texto de competidores
function analizarPatronesTextoCompetidores(videos: TikTokCompetitorVideoData[]) {
  const textos = videos.map(v => v.text || '').filter(t => t.length > 0);
  const promedioLongitud = textos.length > 0 ? 
    Math.round(textos.reduce((a, b) => a + b.length, 0) / textos.length) : 0;
  
  // Analizar uso de emojis
  const videosConEmojis = textos.filter(texto => /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(texto)).length;
  
  // Buscar palabras clave comunes (excluyendo palabras muy cortas)
  const todasPalabras = textos
    .map(texto => texto.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/))
    .flat()
    .filter(palabra => palabra.length > 3);
  
  const conteoPalabras: { [key: string]: number } = {};
  todasPalabras.forEach(palabra => {
    conteoPalabras[palabra] = (conteoPalabras[palabra] || 0) + 1;
  });
  
  return {
    longitudPromedioTexto: promedioLongitud + " caracteres",
    porcentajeConEmojis: textos.length > 0 ? ((videosConEmojis / textos.length) * 100).toFixed(1) + "%" : "0%",
    palabrasClaveMasUsadas: Object.entries(conteoPalabras)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([palabra, freq]) => ({ palabra, frecuencia: freq })),
    recomendacion: promedioLongitud > 100 ? 
      "Los competidores usan textos largos y descriptivos" : 
      promedioLongitud > 50 ? "Los competidores usan textos moderados" : "Los competidores prefieren textos concisos"
  };
}

// Función para analizar rendimiento por autor/competidor
function analizarPorAutorCompetidores(videos: TikTokCompetitorVideoData[]) {
  const autorStats: { [key: string]: {
    videos: number;
    totalVistas: number;
    totalLikes: number;
    totalComentarios: number;
    totalShares: number;
    promedioEngagement: number;
  } } = {};

  videos.forEach(video => {
    const autor = video["authorMeta.name"];
    if (!autor) return;

    if (!autorStats[autor]) {
      autorStats[autor] = {
        videos: 0,
        totalVistas: 0,
        totalLikes: 0,
        totalComentarios: 0,
        totalShares: 0,
        promedioEngagement: 0
      };
    }

    autorStats[autor].videos++;
    autorStats[autor].totalVistas += video.playCount || 0;
    autorStats[autor].totalLikes += video.diggCount || 0;
    autorStats[autor].totalComentarios += video.commentCount || 0;
    autorStats[autor].totalShares += video.shareCount || 0;
  });

  // Calcular promedios y ordenar por engagement
  const competidoresRanking = Object.entries(autorStats)
    .map(([autor, stats]) => {
      const promedioVistas = stats.videos > 0 ? Math.round(stats.totalVistas / stats.videos) : 0;
      const promedioLikes = stats.videos > 0 ? Math.round(stats.totalLikes / stats.videos) : 0;
      const promedioComentarios = stats.videos > 0 ? Math.round(stats.totalComentarios / stats.videos) : 0;
      const promedioShares = stats.videos > 0 ? Math.round(stats.totalShares / stats.videos) : 0;
      
      const engagementPromedio = promedioVistas > 0 ? 
        ((promedioLikes + promedioComentarios + promedioShares) / promedioVistas * 100) : 0;

      return {
        autor,
        videosAnalizados: stats.videos,
        promedioVistas,
        promedioLikes,
        promedioComentarios,
        promedioShares,
        tasaEngagementPromedio: Number(engagementPromedio.toFixed(2))
      };
    })
    .sort((a, b) => b.tasaEngagementPromedio - a.tasaEngagementPromedio);

  return {
    totalCompetidoresAnalizados: competidoresRanking.length,
    top5CompetidoresPorEngagement: competidoresRanking.slice(0, 5),
    competidorMasActivo: competidoresRanking.reduce((prev, current) => 
      prev.videosAnalizados > current.videosAnalizados ? prev : current, competidoresRanking[0]),
    promedioVideosPorCompetidor: competidoresRanking.length > 0 ? 
      Math.round(competidoresRanking.reduce((sum, c) => sum + c.videosAnalizados, 0) / competidoresRanking.length) : 0
  };
}

// Función para obtener insights específicos de competidores
export function obtenerInsightsCompetidores(resultado: CompetitorAnalysisResult) {
  if (!resultado || (resultado as any).error) {
    return { error: "No se pueden generar insights sin datos válidos" };
  }

  const insights = {
    estrategiasCompetidoresExitosas: [],
    oportunidadesDetectadas: [],
    patronesAReplicar: {},
    ventajasCompetitivas: [],
    recomendacionesEstrategicas: []
  };

  // Analizar videos exitosos de competidores
  if (resultado.top5EngagementOptimo && resultado.top5EngagementOptimo.videosCompletos) {
    const videosExitosos = resultado.top5EngagementOptimo.videosCompletos;
    
    insights.estrategiasCompetidoresExitosas = videosExitosos.map((video: any) => ({
      competidor: video.autor?.nombre || 'Desconocido',
      contenido: video.textoCompleto || '',
      metricas: video.metricas || {},
      duracion: video.duracion || 0,
      tipoMusica: video.multimedia?.musica?.esOriginal ? 'Original' : 'Trending',
      factoresExito: [
        `${video.metricas?.tasaEngagement || 0}% de engagement`,
        `${video.duracion || 0}s de duración`,
        video.multimedia?.musica?.esOriginal ? 'Música original' : 'Música popular'
      ]
    }));

    // Detectar oportunidades basadas en análisis de competidores
    if (resultado.analisisCompetidores) {
      const { patronesMusica, patronesDuracion, patronesTexto, analisisPorAutor } = resultado.analisisCompetidores;
      
      insights.oportunidadesDetectadas = [
        `Duración óptima: ${patronesDuracion.duracionPromedio} según competidores exitosos`,
        `Estrategia musical: ${patronesMusica.recomendacionMusica}`,
        `Longitud de texto: ${patronesTexto.recomendacion}`,
        `Top competidor: ${analisisPorAutor.competidorMasActivo?.autor} con ${analisisPorAutor.competidorMasActivo?.tasaEngagementPromedio}% engagement`
      ];

      insights.patronesAReplicar = {
        duracionOptima: patronesDuracion.duracionPromedio,
        estrategiaMusical: patronesMusica.porcentajeMusicaOriginal > 50 ? 'Música original' : 'Música trending',
        longitudTexto: patronesTexto.longitudPromedioTexto,
        palabrasClaveEfectivas: patronesTexto.palabrasClaveMasUsadas?.slice(0, 3) || []
      };
    }
  }

  return insights;
}

// Función para comparar con benchmarks de la industria
export function compararConBenchmarks(resultado: CompetitorAnalysisResult) {
  const benchmarks = {
    engagementRatePromedio: 3.5, // 3.5% es típico para TikTok
    duracionOptima: 15, // 15 segundos
    likesPromedioIndustria: 1000,
    comentariosPromedioIndustria: 50
  };

  const stats = resultado.estadisticasGenerales;
  const engagementCalculado = stats.promedioVistas > 0 ? 
    ((stats.promedioLikes + stats.promedioComentarios + stats.promedioShares) / stats.promedioVistas * 100) : 0;

  return {
    rendimientoVsBenchmarks: {
      engagementRate: {
        actual: Number(engagementCalculado.toFixed(2)),
        benchmark: benchmarks.engagementRatePromedio,
        estado: engagementCalculado > benchmarks.engagementRatePromedio ? 'Arriba del promedio' : 'Debajo del promedio'
      },
      likesPromedio: {
        actual: stats.promedioLikes,
        benchmark: benchmarks.likesPromedioIndustria,
        estado: stats.promedioLikes > benchmarks.likesPromedioIndustria ? 'Arriba del promedio' : 'Debajo del promedio'
      },
      comentariosPromedio: {
        actual: stats.promedioComentarios,
        benchmark: benchmarks.comentariosPromedioIndustria,
        estado: stats.promedioComentarios > benchmarks.comentariosPromedioIndustria ? 'Arriba del promedio' : 'Debajo del promedio'
      }
    },
    recomendacionesBasadasEnBenchmarks: [
      engagementCalculado < benchmarks.engagementRatePromedio ? 
        'Mejorar engagement rate - está por debajo del 3.5% promedio de la industria' : 
        'Mantener buen engagement rate',
      stats.promedioLikes < benchmarks.likesPromedioIndustria ?
        'Trabajar en contenido más atractivo para aumentar likes' :
        'Buen rendimiento en likes',
      stats.promedioComentarios < benchmarks.comentariosPromedioIndustria ?
        'Incentivar más comentarios con preguntas y llamadas a la acción' :
        'Excelente generación de comentarios'
    ].filter(rec => rec.length > 0)
  };
}