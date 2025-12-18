# 🎨 Guía Frontend - Análisis por Categoría/Nicho

## 📋 Tabla de Contenidos

1. [Quick Start](#quick-start)
2. [Configuración Inicial](#configuración-inicial)
3. [Servicio API](#servicio-api)
4. [Hooks Personalizados](#hooks-personalizados)
5. [Componentes](#componentes)
6. [Páginas Completas](#páginas-completas)
7. [Tipos TypeScript](#tipos-typescript)
8. [Utilidades](#utilidades)
9. [Ejemplos de UI/UX](#ejemplos-de-uiux)
10. [Testing](#testing)

---

## Quick Start

### Instalación de Dependencias

```bash
npm install axios react-query date-fns chart.js react-chartjs-2
```

### Estructura de Carpetas

```
src/
├── services/
│   └── categoryAnalysisService.ts
├── hooks/
│   ├── useCategoryAnalysis.ts
│   ├── useOptimalHours.ts
│   └── useCompareNiches.ts
├── components/
│   ├── CategoryAnalysis/
│   │   ├── AnalysisForm.tsx
│   │   ├── ResultsView.tsx
│   │   ├── InsightsPanel.tsx
│   │   ├── SuggestionsCard.tsx
│   │   └── ComparisonView.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
├── pages/
│   ├── CategoryAnalysisPage.tsx
│   ├── NicheComparisonPage.tsx
│   └── TrendingDiscoveryPage.tsx
├── types/
│   └── analysis.types.ts
└── utils/
    ├── formatters.ts
    └── analytics.ts
```

---

## Configuración Inicial

### .env

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_TIMEOUT=120000
```

### Axios Config

```typescript
// src/config/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 120000, // 2 minutos (análisis pueden tardar)
});

// Interceptor para añadir token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirigir a login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Servicio API

### services/categoryAnalysisService.ts

```typescript
import api from '../config/axios';
import type {
  CategoryAnalysisRequest,
  CategoryAnalysisResponse,
  CompetitorAnalysisRequest,
  AnalysisHistoryResponse,
  OptimalHoursResponse,
} from '../types/analysis.types';

export const categoryAnalysisService = {
  /**
   * Analizar categoría/nicho por hashtags y keywords
   */
  async analyzeCategory(
    data: CategoryAnalysisRequest
  ): Promise<CategoryAnalysisResponse> {
    const response = await api.post('/competitor-analysis/category', data);
    return response.data;
  },

  /**
   * Analizar competidores específicos
   */
  async analyzeCompetitors(
    data: CompetitorAnalysisRequest
  ): Promise<CategoryAnalysisResponse> {
    const response = await api.post('/competitor-analysis/competitors', data);
    return response.data;
  },

  /**
   * Analizar trending por región
   */
  async analyzeTrending(data: {
    region?: string;
    numberOfVideos?: number;
    analyzeTop?: number;
  }): Promise<CategoryAnalysisResponse> {
    const response = await api.post('/competitor-analysis/trending', data);
    return response.data;
  },

  /**
   * Análisis comparativo
   */
  async analyzeComparative(data: {
    yourProfile: string;
    competitorProfiles: string[];
    videosPerProfile?: number;
  }): Promise<any> {
    const response = await api.post('/competitor-analysis/comparative', data);
    return response.data;
  },

  /**
   * Obtener historial de análisis
   */
  async getHistory(params?: {
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<AnalysisHistoryResponse> {
    const response = await api.get('/competitor-analysis/history', { params });
    return response.data;
  },

  /**
   * Obtener análisis específico por ID
   */
  async getAnalysisById(id: string): Promise<CategoryAnalysisResponse> {
    const response = await api.get(`/competitor-analysis/${id}`);
    return response.data;
  },

  /**
   * Obtener horarios óptimos
   */
  async getOptimalHours(
    analysisId?: string,
    topHours: number = 10
  ): Promise<OptimalHoursResponse[]> {
    const response = await api.get('/calendar/optimal-hours', {
      params: { analysisId, topHours },
    });
    return response.data;
  },
};
```

---

## Hooks Personalizados

### hooks/useCategoryAnalysis.ts

```typescript
import { useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { categoryAnalysisService } from '../services/categoryAnalysisService';
import type { CategoryAnalysisRequest, CategoryAnalysisResponse } from '../types/analysis.types';

export const useCategoryAnalysis = () => {
  const [currentAnalysis, setCurrentAnalysis] = useState<CategoryAnalysisResponse | null>(null);

  // Mutación para análisis de categoría
  const analyzeMutation = useMutation(
    (data: CategoryAnalysisRequest) => categoryAnalysisService.analyzeCategory(data),
    {
      onSuccess: (data) => {
        setCurrentAnalysis(data);
      },
    }
  );

  // Query para historial
  const { data: history, isLoading: isLoadingHistory } = useQuery(
    'analysisHistory',
    () => categoryAnalysisService.getHistory({ limit: 20 })
  );

  return {
    // Estado
    currentAnalysis,
    isAnalyzing: analyzeMutation.isLoading,
    error: analyzeMutation.error,
    history: history?.data || [],
    isLoadingHistory,

    // Acciones
    analyzeCategory: analyzeMutation.mutate,
    clearAnalysis: () => setCurrentAnalysis(null),

    // Helpers
    hasResults: !!currentAnalysis?.insights,
  };
};
```

### hooks/useOptimalHours.ts

```typescript
import { useQuery } from 'react-query';
import { categoryAnalysisService } from '../services/categoryAnalysisService';

export const useOptimalHours = (analysisId?: string, topHours: number = 10) => {
  const { data, isLoading, error, refetch } = useQuery(
    ['optimalHours', analysisId, topHours],
    () => categoryAnalysisService.getOptimalHours(analysisId, topHours),
    {
      enabled: false, // Solo ejecutar manualmente
    }
  );

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const formattedHours = data?.map((hour) => ({
    ...hour,
    dayName: dayNames[hour.dayOfWeek],
    timeSlot: `${dayNames[hour.dayOfWeek]} ${hour.hour}:00`,
    engagementPercent: (hour.averageEngagement * 100).toFixed(2),
  }));

  return {
    hours: formattedHours || [],
    isLoading,
    error,
    fetchOptimalHours: refetch,
  };
};
```

### hooks/useCompareNiches.ts

```typescript
import { useState } from 'react';
import { categoryAnalysisService } from '../services/categoryAnalysisService';
import type { CategoryAnalysisResponse } from '../types/analysis.types';

interface NicheComparison {
  niche1: CategoryAnalysisResponse | null;
  niche2: CategoryAnalysisResponse | null;
  comparison: {
    engagement: { niche1: number; niche2: number; winner: string };
    competition: { niche1: number; niche2: number; winner: string };
    opportunity: { niche1: number; niche2: number; winner: string };
  } | null;
}

export const useCompareNiches = () => {
  const [comparison, setComparison] = useState<NicheComparison>({
    niche1: null,
    niche2: null,
    comparison: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const compareNiches = async (
    niche1Request: any,
    niche2Request: any
  ) => {
    setIsLoading(true);
    try {
      // Analizar ambos nichos en paralelo
      const [niche1, niche2] = await Promise.all([
        categoryAnalysisService.analyzeCategory(niche1Request),
        categoryAnalysisService.analyzeCategory(niche2Request),
      ]);

      // Calcular métricas de comparación
      const avgEngagement1 =
        niche1.insights.topTopics.reduce((sum, t) => sum + t.avgEngagement, 0) /
        niche1.insights.topTopics.length;

      const avgEngagement2 =
        niche2.insights.topTopics.reduce((sum, t) => sum + t.avgEngagement, 0) /
        niche2.insights.topTopics.length;

      const comparison = {
        engagement: {
          niche1: avgEngagement1,
          niche2: avgEngagement2,
          winner: avgEngagement1 > avgEngagement2 ? 'niche1' : 'niche2',
        },
        competition: {
          niche1: niche1.summary.totalVideos,
          niche2: niche2.summary.totalVideos,
          winner: niche1.summary.totalVideos < niche2.summary.totalVideos ? 'niche1' : 'niche2',
        },
        opportunity: {
          niche1: calculateOpportunityScore(niche1),
          niche2: calculateOpportunityScore(niche2),
          winner: calculateOpportunityScore(niche1) > calculateOpportunityScore(niche2) ? 'niche1' : 'niche2',
        },
      };

      setComparison({ niche1, niche2, comparison });
    } catch (error) {
      console.error('Error comparing niches:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOpportunityScore = (analysis: CategoryAnalysisResponse): number => {
    // Score = (Engagement Alto / Competencia Baja) * 100
    const avgEngagement =
      analysis.insights.topTopics.reduce((sum, t) => sum + t.avgEngagement, 0) /
      analysis.insights.topTopics.length;

    const competitionFactor = 1 - Math.min(analysis.summary.totalVideos / 10000, 1);

    return Math.round(avgEngagement * competitionFactor * 1000);
  };

  return {
    comparison,
    isLoading,
    compareNiches,
    clearComparison: () => setComparison({ niche1: null, niche2: null, comparison: null }),
  };
};
```

---

## Componentes

### components/CategoryAnalysis/AnalysisForm.tsx

```typescript
import React, { useState } from 'react';
import { useCategoryAnalysis } from '../../hooks/useCategoryAnalysis';

interface AnalysisFormProps {
  onSuccess?: () => void;
}

export const AnalysisForm: React.FC<AnalysisFormProps> = ({ onSuccess }) => {
  const { analyzeCategory, isAnalyzing } = useCategoryAnalysis();

  const [formData, setFormData] = useState({
    hashtags: [] as string[],
    keywords: [] as string[],
    numberOfVideos: 200,
    analyzeTop: 30,
    region: '',
    minViews: 5000,
    minEngagementRate: 0.03,
  });

  const [hashtagInput, setHashtagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const addHashtag = () => {
    if (hashtagInput.trim()) {
      const formatted = hashtagInput.startsWith('#')
        ? hashtagInput
        : `#${hashtagInput}`;
      setFormData({
        ...formData,
        hashtags: [...formData.hashtags, formatted],
      });
      setHashtagInput('');
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput],
      });
      setKeywordInput('');
    }
  };

  const removeHashtag = (index: number) => {
    setFormData({
      ...formData,
      hashtags: formData.hashtags.filter((_, i) => i !== index),
    });
  };

  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.hashtags.length === 0 && formData.keywords.length === 0) {
      alert('Debes agregar al menos un hashtag o keyword');
      return;
    }

    analyzeCategory(
      {
        hashtags: formData.hashtags.length > 0 ? formData.hashtags : undefined,
        keywords: formData.keywords.length > 0 ? formData.keywords : undefined,
        numberOfVideos: formData.numberOfVideos,
        analyzeTop: formData.analyzeTop,
        region: formData.region || undefined,
        filters: {
          minViews: formData.minViews,
          minEngagementRate: formData.minEngagementRate,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="analysis-form">
      <div className="form-section">
        <h3>🏷️ Búsqueda por Hashtags</h3>
        <p className="help-text">Ej: #fitness, #cocina, #marketing</p>

        <div className="input-group">
          <input
            type="text"
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
            placeholder="Escribe un hashtag y presiona Enter"
            className="form-input"
          />
          <button type="button" onClick={addHashtag} className="btn-secondary">
            Agregar
          </button>
        </div>

        <div className="tags-container">
          {formData.hashtags.map((hashtag, index) => (
            <span key={index} className="tag">
              {hashtag}
              <button type="button" onClick={() => removeHashtag(index)} className="tag-remove">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>🔍 Búsqueda por Keywords</h3>
        <p className="help-text">Ej: recetas saludables, ejercicios en casa</p>

        <div className="input-group">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            placeholder="Escribe una keyword y presiona Enter"
            className="form-input"
          />
          <button type="button" onClick={addKeyword} className="btn-secondary">
            Agregar
          </button>
        </div>

        <div className="tags-container">
          {formData.keywords.map((keyword, index) => (
            <span key={index} className="tag">
              {keyword}
              <button type="button" onClick={() => removeKeyword(index)} className="tag-remove">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>⚙️ Configuración</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Videos a scrapear</label>
            <input
              type="range"
              min="50"
              max="500"
              step="50"
              value={formData.numberOfVideos}
              onChange={(e) =>
                setFormData({ ...formData, numberOfVideos: parseInt(e.target.value) })
              }
              className="form-range"
            />
            <span className="range-value">{formData.numberOfVideos} videos</span>
          </div>

          <div className="form-group">
            <label>Videos a analizar con IA</label>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={formData.analyzeTop}
              onChange={(e) =>
                setFormData({ ...formData, analyzeTop: parseInt(e.target.value) })
              }
              className="form-range"
            />
            <span className="range-value">{formData.analyzeTop} videos</span>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Región (opcional)</label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="form-select"
            >
              <option value="">Global</option>
              <option value="US">Estados Unidos</option>
              <option value="MX">México</option>
              <option value="ES">España</option>
              <option value="AR">Argentina</option>
              <option value="CO">Colombia</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>🎯 Filtros</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Mínimo de views</label>
            <input
              type="number"
              value={formData.minViews}
              onChange={(e) =>
                setFormData({ ...formData, minViews: parseInt(e.target.value) })
              }
              className="form-input"
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Engagement mínimo (%)</label>
            <input
              type="number"
              value={formData.minEngagementRate * 100}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minEngagementRate: parseFloat(e.target.value) / 100,
                })
              }
              className="form-input"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={isAnalyzing || (formData.hashtags.length === 0 && formData.keywords.length === 0)}
          className="btn-primary"
        >
          {isAnalyzing ? (
            <>
              <span className="spinner" />
              Analizando... Esto puede tomar 1-2 minutos
            </>
          ) : (
            '🚀 Analizar Nicho'
          )}
        </button>
      </div>

      {isAnalyzing && (
        <div className="analysis-progress">
          <div className="progress-steps">
            <div className="step active">1. Scraping videos...</div>
            <div className="step">2. Filtrando resultados...</div>
            <div className="step">3. Analizando con IA...</div>
            <div className="step">4. Generando insights...</div>
          </div>
        </div>
      )}
    </form>
  );
};
```

### components/CategoryAnalysis/InsightsPanel.tsx

```typescript
import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { CategoryAnalysisResponse } from '../../types/analysis.types';

interface InsightsPanelProps {
  analysis: CategoryAnalysisResponse;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ analysis }) => {
  const { insights, summary } = analysis;

  // Datos para gráfico de temas
  const topicsChartData = {
    labels: insights.topTopics.slice(0, 8).map((t) => t.topic),
    datasets: [
      {
        label: 'Frecuencia',
        data: insights.topTopics.slice(0, 8).map((t) => t.frequency),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para gráfico de hashtags
  const hashtagsChartData = {
    labels: insights.topHashtags.slice(0, 8).map((h) => h.hashtag),
    datasets: [
      {
        label: 'Promedio de Views',
        data: insights.topHashtags.slice(0, 8).map((h) => h.avgViews),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="insights-panel">
      {/* Resumen General */}
      <div className="summary-cards">
        <div className="card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <p className="card-label">Videos Analizados</p>
            <h3 className="card-value">{summary.totalVideos.toLocaleString()}</h3>
            <p className="card-subtitle">
              {summary.analyzedVideos} analizados con IA
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">⚡</div>
          <div className="card-content">
            <p className="card-label">Engagement Promedio</p>
            <h3 className="card-value">
              {(
                insights.topTopics.reduce((sum, t) => sum + t.avgEngagement, 0) /
                insights.topTopics.length *
                100
              ).toFixed(2)}
              %
            </h3>
            <p className="card-subtitle">En videos top</p>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">🎥</div>
          <div className="card-content">
            <p className="card-label">Duración Óptima</p>
            <h3 className="card-value">
              {insights.durationAnalysis.optimal.median}s
            </h3>
            <p className="card-subtitle">
              Rango: {insights.durationAnalysis.optimal.min}s -{' '}
              {insights.durationAnalysis.optimal.max}s
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">⏱️</div>
          <div className="card-content">
            <p className="card-label">Tiempo de Análisis</p>
            <h3 className="card-value">
              {Math.round(summary.processingTime / 1000)}s
            </h3>
            <p className="card-subtitle">Procesamiento completo</p>
          </div>
        </div>
      </div>

      {/* Top Topics */}
      <div className="insights-section">
        <h2>🔥 Temas Principales</h2>
        <div className="chart-container">
          <Bar data={topicsChartData} options={{ responsive: true }} />
        </div>

        <div className="topics-list">
          {insights.topTopics.slice(0, 10).map((topic, index) => (
            <div key={index} className="topic-item">
              <div className="topic-rank">#{index + 1}</div>
              <div className="topic-content">
                <h4>{topic.topic}</h4>
                <div className="topic-stats">
                  <span>{topic.frequency} videos</span>
                  <span>{(topic.avgEngagement * 100).toFixed(2)}% engagement</span>
                </div>
              </div>
              <div className="topic-score">
                <div
                  className="score-bar"
                  style={{
                    width: `${(topic.frequency / insights.topTopics[0].frequency) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Hashtags */}
      <div className="insights-section">
        <h2>#️⃣ Hashtags Más Efectivos</h2>
        <div className="chart-container">
          <Bar data={hashtagsChartData} options={{ responsive: true }} />
        </div>

        <div className="hashtags-grid">
          {insights.topHashtags.slice(0, 12).map((hashtag, index) => (
            <div key={index} className="hashtag-card">
              <h4 className="hashtag">{hashtag.hashtag}</h4>
              <div className="hashtag-stats">
                <div className="stat">
                  <span className="stat-label">Uso</span>
                  <span className="stat-value">{hashtag.usage} videos</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Avg Views</span>
                  <span className="stat-value">
                    {(hashtag.avgViews / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Engagement</span>
                  <span className="stat-value">
                    {(hashtag.avgEngagement * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Creators */}
      {insights.topCreators && insights.topCreators.length > 0 && (
        <div className="insights-section">
          <h2>🌟 Creadores Destacados</h2>
          <div className="creators-list">
            {insights.topCreators.slice(0, 10).map((creator, index) => (
              <div key={index} className="creator-item">
                <div className="creator-rank">#{index + 1}</div>
                <div className="creator-info">
                  <h4>{creator.username}</h4>
                  <p>
                    {creator.videoCount} videos |{' '}
                    {(creator.avgEngagement * 100).toFixed(2)}% engagement
                  </p>
                </div>
                <a
                  href={`https://www.tiktok.com/@${creator.username.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  Ver perfil →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Practices */}
      <div className="insights-section">
        <h2>✅ Mejores Prácticas Identificadas</h2>
        <ul className="best-practices-list">
          {insights.bestPractices.map((practice, index) => (
            <li key={index} className="practice-item">
              <span className="practice-icon">✓</span>
              <span>{practice}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trending Patterns */}
      {insights.trendingPatterns && insights.trendingPatterns.length > 0 && (
        <div className="insights-section">
          <h2>📈 Patrones Trending</h2>
          <div className="patterns-grid">
            {insights.trendingPatterns.map((pattern, index) => (
              <div key={index} className="pattern-card">
                <span className="pattern-icon">🔥</span>
                <p>{pattern}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### components/CategoryAnalysis/SuggestionsCard.tsx

```typescript
import React, { useState } from 'react';
import type { ContentSuggestion } from '../../types/analysis.types';

interface SuggestionsCardProps {
  suggestions: ContentSuggestion[];
  onSaveToCalendar?: (suggestion: ContentSuggestion) => void;
  onCopyToClipboard?: (suggestion: ContentSuggestion) => void;
}

export const SuggestionsCard: React.FC<SuggestionsCardProps> = ({
  suggestions,
  onSaveToCalendar,
  onCopyToClipboard,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const engagementColors = {
    high: 'bg-green-500',
    'medium-high': 'bg-blue-500',
    medium: 'bg-yellow-500',
    low: 'bg-gray-500',
  };

  const engagementLabels = {
    high: 'Alto',
    'medium-high': 'Medio-Alto',
    medium: 'Medio',
    low: 'Bajo',
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="suggestions-container">
      <div className="suggestions-header">
        <h2>💡 Sugerencias de Contenido</h2>
        <p>{suggestions.length} ideas generadas basadas en tu análisis</p>
      </div>

      <div className="suggestions-grid">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`suggestion-card ${expandedIndex === index ? 'expanded' : ''}`}
          >
            <div className="suggestion-header" onClick={() => toggleExpand(index)}>
              <div className="suggestion-number">#{index + 1}</div>
              <h3>{suggestion.title}</h3>
              <span
                className={`engagement-badge ${
                  engagementColors[suggestion.estimatedEngagement]
                }`}
              >
                {engagementLabels[suggestion.estimatedEngagement]}
              </span>
            </div>

            <div className="suggestion-body">
              <p className="suggestion-description">{suggestion.description}</p>

              {expandedIndex === index && (
                <>
                  <div className="suggestion-hashtags">
                    <h4>Hashtags sugeridos:</h4>
                    <div className="hashtags-list">
                      {suggestion.suggestedHashtags.map((tag, i) => (
                        <span key={i} className="hashtag-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {suggestion.targetAudience && (
                    <div className="suggestion-audience">
                      <h4>Audiencia objetivo:</h4>
                      <p>{suggestion.targetAudience}</p>
                    </div>
                  )}

                  <div className="suggestion-reasoning">
                    <h4>Por qué funcionará:</h4>
                    <p>{suggestion.reasoning}</p>
                  </div>

                  {suggestion.inspirationFrom && (
                    <div className="suggestion-inspiration">
                      <span className="inspiration-icon">💡</span>
                      <span>Inspirado en: {suggestion.inspirationFrom}</span>
                    </div>
                  )}

                  <div className="suggestion-actions">
                    {onSaveToCalendar && (
                      <button
                        onClick={() => onSaveToCalendar(suggestion)}
                        className="btn-primary"
                      >
                        📅 Agregar al Calendario
                      </button>
                    )}
                    {onCopyToClipboard && (
                      <button
                        onClick={() => onCopyToClipboard(suggestion)}
                        className="btn-secondary"
                      >
                        📋 Copiar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {expandedIndex !== index && (
              <button
                onClick={() => toggleExpand(index)}
                className="expand-button"
              >
                Ver detalles →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Páginas Completas

### pages/CategoryAnalysisPage.tsx

```typescript
import React, { useState } from 'react';
import { AnalysisForm } from '../components/CategoryAnalysis/AnalysisForm';
import { InsightsPanel } from '../components/CategoryAnalysis/InsightsPanel';
import { SuggestionsCard } from '../components/CategoryAnalysis/SuggestionsCard';
import { useOptimalHours } from '../hooks/useOptimalHours';
import { useCategoryAnalysis } from '../hooks/useCategoryAnalysis';

export const CategoryAnalysisPage: React.FC = () => {
  const { currentAnalysis, history, isLoadingHistory } = useCategoryAnalysis();
  const { hours, fetchOptimalHours, isLoading: isLoadingHours } = useOptimalHours(
    currentAnalysis?.analysisId,
    10
  );

  const [activeTab, setActiveTab] = useState<'form' | 'results' | 'history'>('form');

  const handleAnalysisSuccess = () => {
    setActiveTab('results');
  };

  const handleSaveToCalendar = (suggestion: any) => {
    // Implementar guardado en calendario
    console.log('Saving to calendar:', suggestion);
  };

  const handleCopyToClipboard = (suggestion: any) => {
    const text = `
Título: ${suggestion.title}

Descripción: ${suggestion.description}

Hashtags: ${suggestion.suggestedHashtags.join(' ')}

Por qué funcionará: ${suggestion.reasoning}
    `.trim();

    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles!');
  };

  const handleViewOptimalHours = () => {
    fetchOptimalHours();
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>🔍 Análisis de Categoría/Nicho</h1>
        <p>
          Descubre qué funciona en tu nicho analizando hasta 500 videos con IA
        </p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          🚀 Nuevo Análisis
        </button>
        <button
          className={`tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
          disabled={!currentAnalysis}
        >
          📊 Resultados
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Historial
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'form' && (
          <AnalysisForm onSuccess={handleAnalysisSuccess} />
        )}

        {activeTab === 'results' && currentAnalysis && (
          <div className="results-view">
            <div className="results-actions">
              <button
                onClick={handleViewOptimalHours}
                disabled={isLoadingHours}
                className="btn-secondary"
              >
                {isLoadingHours ? 'Cargando...' : '⏰ Ver Horarios Óptimos'}
              </button>
              <button className="btn-secondary">
                📄 Exportar Reporte PDF
              </button>
              <button className="btn-secondary">
                🔗 Compartir Análisis
              </button>
            </div>

            {hours.length > 0 && (
              <div className="optimal-hours-section">
                <h3>⏰ Mejores Horarios para Publicar</h3>
                <div className="hours-grid">
                  {hours.map((hour, index) => (
                    <div key={index} className="hour-card">
                      <div className="hour-rank">#{index + 1}</div>
                      <div className="hour-time">{hour.timeSlot}</div>
                      <div className="hour-engagement">
                        {hour.engagementPercent}% engagement
                      </div>
                      <div className="hour-sample">
                        {hour.sampleSize} videos
                      </div>
                      <div className="hour-score">
                        Score: {Math.round(hour.score)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <InsightsPanel analysis={currentAnalysis} />

            {currentAnalysis.contentSuggestions && (
              <SuggestionsCard
                suggestions={currentAnalysis.contentSuggestions}
                onSaveToCalendar={handleSaveToCalendar}
                onCopyToClipboard={handleCopyToClipboard}
              />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-view">
            {isLoadingHistory ? (
              <div className="loading">Cargando historial...</div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <p>No tienes análisis previos</p>
                <button onClick={() => setActiveTab('form')}>
                  Crear primer análisis
                </button>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item: any) => (
                  <div key={item.id} className="history-item">
                    <div className="history-header">
                      <h4>
                        {item.parameters.hashtags?.join(', ') ||
                          item.parameters.keywords?.join(', ')}
                      </h4>
                      <span className={`status ${item.status}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="history-meta">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      <span>
                        {item.scrapingMetadata?.totalVideosScraped || 0} videos
                      </span>
                    </div>
                    <button className="btn-link">Ver resultados →</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Tipos TypeScript

### types/analysis.types.ts

```typescript
// Request Types
export interface CategoryAnalysisRequest {
  hashtags?: string[];
  keywords?: string[];
  numberOfVideos?: number;
  analyzeTop?: number;
  region?: string;
  filters?: {
    minViews?: number;
    minEngagementRate?: number;
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

export interface CompetitorAnalysisRequest {
  competitorProfiles: string[];
  videosPerProfile?: number;
  analyzeTop?: number;
  filters?: {
    minViews?: number;
    minEngagementRate?: number;
  };
}

// Response Types
export interface CategoryAnalysisResponse {
  success: boolean;
  analysisId: string;
  summary: {
    totalVideos: number;
    analyzedVideos: number;
    processingTime: number;
  };
  insights: {
    topTopics: Array<{
      topic: string;
      frequency: number;
      avgEngagement: number;
    }>;
    topHashtags: Array<{
      hashtag: string;
      usage: number;
      avgViews: number;
      avgEngagement: number;
    }>;
    topCreators?: Array<{
      username: string;
      videoCount: number;
      avgEngagement: number;
    }>;
    durationAnalysis: {
      optimal: {
        min: number;
        max: number;
        median: number;
      };
      avgDuration: number;
    };
    bestPractices: string[];
    trendingPatterns?: string[];
  };
  contentSuggestions: ContentSuggestion[];
}

export interface ContentSuggestion {
  title: string;
  description: string;
  suggestedHashtags: string[];
  targetAudience?: string;
  estimatedEngagement: 'high' | 'medium-high' | 'medium' | 'low';
  reasoning: string;
  inspirationFrom?: string;
}

export interface OptimalHoursResponse {
  hour: number;
  dayOfWeek: number;
  averageEngagement: number;
  sampleSize: number;
  score: number;
}

export interface AnalysisHistoryResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## Próxima parte...

¿Quieres que continúe con:
1. Estilos CSS completos
2. Utilidades y helpers
3. Tests unitarios
4. Casos de uso específicos (ej: comparación de nichos)
5. Integración con calendario

Dime qué sección necesitas y continúo! 🚀