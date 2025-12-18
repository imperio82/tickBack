# Debug: Regeneración de Insights

## ✅ Confirmación: SÍ envía todo a Gemini

### Datos que se envían en cada regeneración:

#### 1. **Datos Filtrados del Perfil** (`profileAnalysis.filteredData`)
```typescript
{
  resumen: {
    totalVideos: number,
    videosConLikes: number,
    videosConComentarios: number,
    videosConShares: number
  },
  estadisticasGenerales: { ... },
  analisisContenido: { ... }
}
```

#### 2. **Análisis de Cada Video** (`job.videoAnalysisResults`)
```typescript
[
  {
    videoId: string,
    videoData: {
      id: string,
      texto: string,         // Descripción completa
      vistas: number,
      likes: number,
      comentarios: number,
      compartidos: number,
      hashtags: string[],
      metricas: {
        tasaEngagement: number
      },
      autor: { ... }
    },
    videoAnalysis: {
      labels: [               // Labels detectados por Google AI
        {
          entity: string,
          confidence: number,
          segments: [...]
        }
      ],
      speechTranscriptions: [ // Transcripciones de audio
        {
          alternatives: [
            {
              transcript: string,  // Texto completo del video
              confidence: number,
              words: [...]
            }
          ]
        }
      ],
      shotChanges: [          // Cambios de escena
        {
          startTime: string,
          endTime: string
        }
      ],
      processingTime: number
    },
    analyzedAt: Date
  }
]
```

#### 3. **Opciones Personalizadas**
```typescript
{
  temperature: 0.7,              // Control de creatividad
  enfoque: 'creativo',           // Tipo de análisis
  numeroIdeas: 5                 // Cantidad de ideas
}
```

---

## 🔍 Prompt Completo Construido

El método `buildGeminiPrompt()` construye este prompt:

```markdown
# ANÁLISIS COMPLETO DE PERFIL DE TIKTOK

## 1. DATOS FILTRADOS DEL PERFIL

### Resumen General
- Total de videos analizados: X
- Videos con likes: X
- Videos con comentarios: X
- Videos con shares: X

### Estadísticas Generales
{JSON completo de estadísticas}

### Análisis de Contenido
{JSON completo de análisis de contenido}

## 2. ANÁLISIS DETALLADO DE VIDEOS CON GOOGLE AI

Total de videos analizados con IA: X

### Video 1: {videoId}

**Métricas:**
- Vistas: X
- Likes: X
- Comentarios: X
- Compartidos: X
- Engagement Rate: X%

**Descripción:** {texto completo del video}

**Hashtags:** #hashtag1, #hashtag2, ...

**Análisis de Google AI:**
- Labels detectados: label1, label2, label3, ...
- Transcripción: {primeros 200 caracteres de la transcripción}...
- Cambios de escena: X

### Video 2: ...
### Video 3: ...
...

## 3. TU TAREA

Por favor, analiza toda esta información y proporciona:

1. Resumen General
2. Patrones Identificados
3. Temas Principales
4. Análisis de Engagement
5. Recomendaciones Específicas (enfoque: {enfoque})
6. Ideas de Contenido: Exactamente {numeroIdeas} ideas
7. Estrategia de Hashtags
8. Estrategia Musical
9. Formato Óptimo
```

---

## ⚡ Diferencias por Enfoque

El `systemInstruction` cambia según el enfoque:

### 📊 Analítico (default)
```
ENFOQUE ANALÍTICO: Genera insights basados en datos.
Prioriza métricas, patrones estadísticos y evidencia cuantitativa.
```

### 🎨 Creativo
```
ENFOQUE CREATIVO: Genera ideas innovadoras, atrevidas y originales.
Prioriza la creatividad y el impacto visual.
Sugiere tendencias emergentes y formatos únicos.
```

### 🔥 Viral
```
ENFOQUE VIRAL: Genera ideas con alto potencial de viralidad.
Prioriza elementos que maximicen el engagement, shares y alcance.
Enfócate en tendencias actuales, hooks emocionales y formatos compartibles.
```

### 📚 Educativo
```
ENFOQUE EDUCATIVO: Genera contenido educativo y de valor.
Prioriza la claridad, utilidad y aprendizaje del usuario.
Enfócate en tutoriales, tips prácticos y contenido instructivo.
```

### 🛡️ Conservador
```
ENFOQUE CONSERVADOR: Genera recomendaciones probadas y de bajo riesgo.
Prioriza estrategias que han funcionado consistentemente.
Enfócate en mejoras incrementales y contenido evergreen.
```

---

## 🐛 Posibles Problemas

### 1. **Respuestas Similares con Misma Temperatura**

**Problema:** Si usas la misma temperatura (ej: 0.7) múltiples veces, Gemini generará respuestas similares.

**Solución:**
```typescript
// Para variación máxima, usar temperatura alta
{
  temperature: 0.9,  // Más aleatorio y creativo
  enfoque: 'creativo'
}

// Para consistencia, usar temperatura baja
{
  temperature: 0.3,  // Más determinístico
  enfoque: 'conservador'
}
```

### 2. **Cache de Gemini**

**Problema:** Gemini puede cachear respuestas para prompts muy similares.

**Solución:** Cambiar el enfoque o temperatura genera diferentes system instructions, lo que evita el cache.

### 3. **videoAnalysisResults Incompletos**

**Problema:** Si los `videoAnalysisResults` no tienen toda la información.

**Verificar:**
```typescript
// En el endpoint de status
GET /profile-analysis/:analysisId/video-analysis-status/:jobId

// Response debe tener:
{
  videoAnalysisResults: [
    {
      videoId: "xxx",
      videoData: { ... },      // ✅ Debe tener texto, hashtags, métricas
      videoAnalysis: {
        labels: [...],         // ✅ Debe tener labels
        speechTranscriptions: [...], // ✅ Debe tener transcripciones
        shotChanges: [...]     // ✅ Debe tener cambios de escena
      }
    }
  ]
}
```

---

## 🔧 Cómo Verificar que Todo se Envía

### 1. Revisar Logs del Backend

Buscar estos logs al regenerar:

```
[Job xxx] 🔄 Regenerando insights de Gemini (creativo, temp: 0.9)...
[Job xxx] Usando 5 análisis de videos existentes
[Job xxx] Preparando prompt para Gemini (creativo)...
[Job xxx] Enviando XXXXX caracteres a Gemini Pro...  ← Debe ser > 5000 caracteres
[Job xxx] Respuesta de Gemini recibida - Tokens: XXXX
```

### 2. Verificar Tamaño del Prompt

El prompt debe tener **al menos 3000-5000 caracteres** si tiene:
- Datos filtrados completos
- 3-5 videos con análisis completo

Si el prompt tiene < 1000 caracteres, algo está faltando.

### 3. Verificar Response de Gemini

```typescript
// La respuesta debe incluir:
{
  rawResponse: string,        // Texto completo de Gemini
  parsedInsights: {
    resumenGeneral: string,
    patronesIdentificados: string[],
    ideasContenido: [...]     // Debe tener el número exacto de ideas
  },
  usage: {
    totalTokenCount: number   // Debe ser > 1000 tokens
  },
  enfoque: 'creativo',        // Enfoque usado
  temperature: 0.9            // Temperatura usada
}
```

---

## 🧪 Test Manual

### Paso 1: Verificar que hay videoAnalysisResults

```bash
curl -X GET "http://localhost:3000/profile-analysis/{analysisId}/video-analysis-status/{jobId}" \
  -H "Authorization: Bearer {token}"

# Verificar que:
# - videoAnalysisResults existe
# - videoAnalysisResults.length > 0
# - Cada resultado tiene videoData y videoAnalysis completos
```

### Paso 2: Regenerar con Temperatura Alta

```bash
curl -X POST "http://localhost:3000/profile-analysis/{analysisId}/regenerate-insights/{jobId}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 0.95,
    "enfoque": "creativo",
    "numeroIdeas": 10,
    "guardarVariante": true,
    "nombreVariante": "Test Variabilidad"
  }'
```

### Paso 3: Regenerar con Enfoque Diferente

```bash
curl -X POST "http://localhost:3000/profile-analysis/{analysisId}/regenerate-insights/{jobId}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 0.9,
    "enfoque": "viral",
    "numeroIdeas": 5,
    "guardarVariante": true,
    "nombreVariante": "Test Viral"
  }'
```

### Paso 4: Comparar Resultados

```bash
# Obtener insights principales
curl -X GET "http://localhost:3000/profile-analysis/{analysisId}/insights" \
  -H "Authorization: Bearer {token}"

# Las variantes deberían tener:
# - Diferentes recomendaciones
# - Diferentes ideas de contenido
# - Diferentes tonos según el enfoque
```

---

## 📋 Checklist de Verificación

- [ ] ¿`videoAnalysisResults` tiene datos completos?
- [ ] ¿El prompt tiene > 3000 caracteres?
- [ ] ¿La temperatura es diferente (0.3 vs 0.9)?
- [ ] ¿El enfoque es diferente?
- [ ] ¿Los logs muestran "Enviando XXXX caracteres a Gemini"?
- [ ] ¿La respuesta de Gemini tiene > 1000 tokens?
- [ ] ¿Las variantes se guardan correctamente?
- [ ] ¿El frontend muestra las variantes?

---

## 🚀 Mejoras Sugeridas

### Agregar Logging Detallado

Agregar al processor:

```typescript
// En generateGeminiInsights, antes de enviar a Gemini
this.logger.log(`[Job ${jobId}] 📊 Prompt stats:`);
this.logger.log(`  - Longitud: ${prompt.length} caracteres`);
this.logger.log(`  - Videos incluidos: ${videoAnalysisResults.length}`);
this.logger.log(`  - Temperature: ${opts.temperature}`);
this.logger.log(`  - Enfoque: ${opts.enfoque}`);
this.logger.log(`  - Ideas solicitadas: ${opts.numeroIdeas}`);

// Después de recibir respuesta
this.logger.log(`[Job ${jobId}] 📥 Gemini response:`);
this.logger.log(`  - Tokens usados: ${response.usage?.totalTokenCount || 'N/A'}`);
this.logger.log(`  - Longitud respuesta: ${response.text.length} caracteres`);
```

### Endpoint de Debug

Crear endpoint para ver el prompt que se enviaría:

```typescript
@Get(':analysisId/debug-prompt/:jobId')
async debugPrompt(@Param('jobId') jobId: string) {
  const job = await this.videoAnalysisJobService.findById(jobId);
  const profileAnalysis = await this.profileAnalysisService.findById(job.profileAnalysisId);

  const prompt = this.videoAnalysisProcessor.buildGeminiPrompt(
    profileAnalysis.filteredData,
    job.videoAnalysisResults,
    'creativo',
    5
  );

  return {
    promptLength: prompt.length,
    videosCount: job.videoAnalysisResults.length,
    promptPreview: prompt.substring(0, 500) + '...',
    fullPrompt: prompt // Solo en desarrollo
  };
}
```
