//@ts-nocheck
import { TikTokVideoData } from "./typeDataApify";

export function analizarDatosTikTok(data: any) {
  // Verificar que tengamos datos válidos
  if (!data || !data.data || !Array.isArray(data.data)) {
    return {
      error: "Datos inválidos o no encontrados"
    };
  }

  const videos:TikTokVideoData[]  = data.data;

  // 1. FILTRAR Y ORDENAR POR VISTAS (playCount)
  const videosPorVistas = [...videos].sort((a, b) => b.playCount - a.playCount);
  const top5PorVistas = videosPorVistas.slice(0, 5);

  // Extraer hashtags más comunes de los top 5 videos con más vistas
  const hashtagsConteo = {};
  top5PorVistas.forEach(video => {
    if (video.hashtags && Array.isArray(video.hashtags)) {
      video.hashtags.forEach(hashtag => {
        const tagName = hashtag.name;
        hashtagsConteo[tagName] = (hashtagsConteo[tagName] || 0) + 1;
      });
    }
  });

  // Ordenar hashtags por frecuencia
  const hashtagsMasComunes = Object.entries(hashtagsConteo)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ hashtag: tag, frecuencia: count }));

  // 2. ANÁLISIS MEJORADO: TOP VIDEOS POR LIKES + ENGAGEMENT COMBINADO
  // Descartar videos sin likes
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
  
  // Tomar los top 5 con mejor engagement
  const top5EngagementOptimo = videosPorEngagement.slice(0, 5);

  // 3. FILTRAR Y ORDENAR POR COMENTARIOS
  const videosConComentarios = videos.filter(video => video.commentCount > 0);
  const videosPorComentarios = videosConComentarios.sort((a, b) => b.commentCount - a.commentCount);
  const top5PorComentarios = videosPorComentarios.slice(0, 5);

  // 4. FILTRAR Y ORDENAR POR SHARES (shareCount)
  const videosConShares = videos.filter(video => video.shareCount > 0);
  const videosPorShares = videosConShares.sort((a, b) => b.shareCount - a.shareCount);
  const top5PorShares = videosPorShares.slice(0, 5);

  // Función auxiliar para formatear la información COMPLETA de un video para IA
  function formatearVideoParaIA(video) {
    return {
      id: video.id,
      texto: video.text || '',
      textoCompleto: video.text || '',
      vistas: video.playCount || 0,
      likes: video.diggCount || 0,
      comentarios: video.commentCount || 0,
      compartidos: video.shareCount || 0,
      saves: video.collectCount || 0,
      duracion: video.videoMeta?.duration || 0,
      fecha: video.createTimeISO,
      hashtags: video.hashtags?.map(h => h.name) || [],
      
      // INFORMACIÓN MULTIMEDIA PARA IA (estructura original)
      multimedia: {
        coverUrl: video.videoMeta?.coverUrl || null,
        originalCoverUrl: video.videoMeta?.originalCoverUrl || null,
        webVideoUrl: video.webVideoUrl || null,
        mediaUrls: video.mediaUrls || [],
        
        // Información de música CLAVE para IA (basada en musicMeta original)
        musica: {
          nombre: video.musicMeta?.musicName || null,
          autor: video.musicMeta?.musicAuthor || null,
          esOriginal: video.musicMeta?.musicOriginal || false,
          album: video.musicMeta?.musicAlbum || null,
          musicId: video.musicMeta?.musicId || null,
          playUrl: video.musicMeta?.playUrl || null,
          coverMediumUrl: video.musicMeta?.coverMediumUrl || null,
          originalCoverMediumUrl: video.musicMeta?.originalCoverMediumUrl || null
        }
      },
      
      // DATOS ORIGINALES COMPLETOS para referencia
      datosOriginales: {
        musicMeta: video.musicMeta || {},
        videoMeta: video.videoMeta || {},
        authorMeta: video.authorMeta || {}
      },
      
      // MÉTRICAS DE ENGAGEMENT CALCULADAS
      metricas: {
        engagementTotal: (video.commentCount || 0) + (video.shareCount || 0) + (video.diggCount || 0),
        tasaEngagement: video.playCount > 0 ? 
          (((video.commentCount || 0) + (video.shareCount || 0) + (video.diggCount || 0)) / video.playCount * 100).toFixed(2) : 0,
        tasaLikes: video.playCount > 0 ? ((video.diggCount || 0) / video.playCount * 100).toFixed(2) : 0,
        tasaComentarios: video.playCount > 0 ? ((video.commentCount || 0) / video.playCount * 100).toFixed(2) : 0,
        tasaShares: video.playCount > 0 ? ((video.shareCount || 0) / video.playCount * 100).toFixed(2) : 0
      },
      
      // INFORMACIÓN ADICIONAL PARA ANÁLISIS
      autor: {
        nombre: video.authorMeta?.name || '',
        nickName: video.authorMeta?.nickName || '',
        followers: video.authorMeta?.fans || 0,
        verificado: video.authorMeta?.verified || false,
        signature: video.authorMeta?.signature || '',
        avatar: video.authorMeta?.avatar || null
      },
      
      efectos: video.effectStickers?.map(e => e.name) || [],
      esSlideshow: video.isSlideshow || false,
      esAnuncio: video.isAd || false,
      idioma: video.textLanguage || 'unknown'
    };
  }

  // Función auxiliar para formatear resumen de video
  function formatearVideoResumen(video: any) {
    return {
      id: video.id,
      texto: video.text?.substring(0, 100) + (video.text?.length > 100 ? '...' : ''),
      vistas: video.playCount || 0,
      likes: video.diggCount || 0,
      comentarios: video.commentCount || 0,
      compartidos: video.shareCount || 0,
      saves: video.collectCount || 0,
      duracion: video.videoMeta?.duration || 0,
      fecha: video.createTimeISO,
      hashtags: video.hashtags?.map(h => h.name) || [],
      engagementTotal: (video.commentCount || 0) + (video.shareCount || 0) + (video.diggCount || 0)
    };
  }

  // Preparar el resultado final
  const resultado = {
    resumen: {
      totalVideos: videos.length,
      videosConLikes: videosConLikes.length,
      videosConComentarios: videosConComentarios.length,
      videosConShares: videosConShares.length
    },
    
    top5PorVistas: {
      titulo: "Top 5 Videos con Más Vistas",
      videos: top5PorVistas.map(formatearVideoResumen)
    },
    
    hashtagsMasComunes: {
      titulo: "Hashtags Más Comunes en Top 5 Videos Más Vistos",
      hashtags: hashtagsMasComunes
    },
    
    // NUEVA SECCIÓN: VIDEOS ÓPTIMOS PARA ANÁLISIS DE IA
    top5EngagementOptimo: {
      titulo: "Top 5 Videos Óptimos por Likes + Engagement (PARA IA)",
      descripcion: "Videos con más likes que también tienen alto engagement (comentarios + shares)",
      videosCompletos: top5EngagementOptimo.map(formatearVideoParaIA),
      videosResumen: top5EngagementOptimo.map(formatearVideoResumen)
    },
    
    top5PorLikes: {
      titulo: "Top 5 Videos con Más Likes",
      totalConLikes: videosConLikes.length,
      videos: videosPorLikes.slice(0, 5).map(formatearVideoResumen)
    },
    
    top5PorComentarios: {
      titulo: "Top 5 Videos con Más Comentarios",
      totalConComentarios: videosConComentarios.length,
      videos: top5PorComentarios.map(formatearVideoResumen)
    },
    
    top5PorShares: {
      titulo: "Top 5 Videos con Más Compartidos",
      totalConShares: videosConShares.length,
      videos: top5PorShares.map(formatearVideoResumen)
    },
    
    // ANÁLISIS DE CONTENIDO PARA IA
    analisisContenido: {
      patronesMusica: analizarPatronesMusica(top5EngagementOptimo),
      patronesHashtags: analizarPatronesHashtags(top5EngagementOptimo),
      patronesDuracion: analizarPatronesDuracion(top5EngagementOptimo),
      patronesTexto: analizarPatronesTexto(top5EngagementOptimo)
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

// Función para analizar patrones de música
function analizarPatronesMusica(videos: TikTokVideoData[]) {
    console.log("datos recibidos en musica", videos)
  const musicaOriginal = videos.filter(v => v.musicMeta.musicOriginal === true);
  const musicaNoOriginal = videos.filter(v => v.musicMeta.musicOriginal === false);
  
  const artistasPopulares = {};
  videos.forEach(video => {
    const autor = video.musicMeta.musicAuthor;
    if (autor) {
      artistasPopulares[autor] = (artistasPopulares[autor] || 0) + 1;
    }
  });

  return {
    porcentajeMusicaOriginal: videos.length > 0 ? ((musicaOriginal.length / videos.length) * 100).toFixed(1) : 0,
    porcentajeMusicaNoOriginal: videos.length > 0 ? ((musicaNoOriginal.length / videos.length) * 100).toFixed(1) : 0,
    artistasMasUsados: Object.entries(artistasPopulares)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([artista, count]) => ({ artista, frecuencia: count })),
    recomendacionMusica: musicaOriginal.length > musicaNoOriginal.length ? 
      "Usar más música original" : "Usar música popular/trending"
  };
}

// Función para analizar patrones de hashtags
function analizarPatronesHashtags(videos: TikTokVideoData[]) {
  const todosHashtags = [];
  videos.forEach(video => {
    todosHashtags.push(...video.hashtags);
  });
  
  const conteo = {};
  todosHashtags.forEach(tag => {
    conteo[tag] = (conteo[tag] || 0) + 1;
  });
  
  const promedioHashtags = videos.length > 0 ? 
    (todosHashtags.length / videos.length).toFixed(1) : 0;
  
  return {
    hashtagsMasEfectivos: Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, freq]) => ({ hashtag: tag, frecuencia: freq })),
    promedioHashtagsPorVideo: promedioHashtags,
    recomendacion: Number(promedioHashtags) > 5 ? 
      "Reducir cantidad de hashtags" : "Considerar más hashtags relevantes"
  };
}

// Función para analizar patrones de duración
function analizarPatronesDuracion(videos: TikTokVideoData[]) {
  const duraciones = videos.map(v => v.videoMeta.duration).filter(d => d > 0);
  const promedio = duraciones.length > 0 ? 
    (duraciones.reduce((a, b) => a + b, 0) / duraciones.length).toFixed(1) : 0;
  
  const cortos = duraciones.filter(d => d <= 15).length;
  const medios = duraciones.filter(d => d > 15 && d <= 30).length;
  const largos = duraciones.filter(d => d > 30).length;
  
  return {
    duracionPromedio: promedio + " segundos",
    distribucion: {
      cortos: `${cortos} videos (≤15s)`,
      medios: `${medios} videos (15-30s)`,
      largos: `${largos} videos (>30s)`
    },
    recomendacion: cortos > medios + largos ? 
      "Mantener videos cortos (≤15s)" : "Experimentar con diferentes duraciones"
  };
}

// Función para analizar patrones de texto
function analizarPatronesTexto(videos: TikTokVideoData[]) {
  const textosLongitud = videos.map(v => v.text);
  const promedioLongitud = textosLongitud.length > 0 ? 
    (textosLongitud.reduce((a, b) => a + b, 0) / textosLongitud.length).toFixed(0) : 0;
  
  // Buscar palabras clave comunes
  const todasPalabras = videos.map(v => v.text.toLowerCase().split(/\s+/))
    .flat()
    .filter(palabra => palabra.length > 3); // Solo palabras de más de 3 caracteres
  
  const conteopalabras = {};
  todasPalabras.forEach(palabra => {
    conteopalabras[palabra] = (conteopalabras[palabra] || 0) + 1;
  });
  
  return {
    longitudPromedioTexto: promedioLongitud + " caracteres",
    palabrasClave: Object.entries(conteopalabras)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([palabra, freq]) => ({ palabra, frecuencia: freq })),
    recomendacion: Number(promedioLongitud) > 100 ? 
      "Considerar textos más concisos" : "Textos de buena longitud"
  };
}

// Función mejorada para obtener insights para IA
export function obtenerInsightsParaIA(resultado) {
  if (!resultado || resultado.error) {
    return { error: "No se pueden generar insights sin datos válidos" };
  }

  const insights = {
    recomendacionesContenido: [],
    estrategiaHashtags: [],
    estrategiaMusical: {},
    patronesOptimos: {},
    accionesRecomendadas: []
  };

  // Analizar los videos óptimos
  if (resultado.top5EngagementOptimo && resultado.top5EngagementOptimo.videosCompletos) {
    const videosOptimos = resultado.top5EngagementOptimo.videosCompletos;
    
    // Recomendaciones de contenido basadas en videos exitosos
    insights.recomendacionesContenido = videosOptimos.map(video => ({
      ejemplo: video.textoCompleto || '',
      metricas: video.metricas || {},
      hashtags: video.hashtags || [],
      musica: (video.multimedia && video.multimedia.musica) || {},
      duracion: video.duracion || 0,
      razonDelExito: video.metricas ? `${video.metricas.tasaEngagement}% engagement rate` : 'Métricas no disponibles'
    }));

    // Estrategia de hashtags
    if (resultado.analisisContenido?.patronesHashtags) {
      insights.estrategiaHashtags = resultado.analisisContenido.patronesHashtags.hashtagsMasEfectivos;
    }

    // Estrategia musical
    if (resultado.analisisContenido?.patronesMusica) {
      insights.estrategiaMusical = resultado.analisisContenido.patronesMusica;
    }

    // Patrones óptimos
    insights.patronesOptimos = {
      duracionRecomendada: resultado.analisisContenido?.patronesDuracion?.duracionPromedio || "15-30 segundos",
      longitudTexto: resultado.analisisContenido?.patronesTexto?.longitudPromedioTexto || "Moderada",
      tipoMusica: resultado.analisisContenido?.patronesMusica?.recomendacionMusica || "Música trending"
    };
  }

  return insights;
}

