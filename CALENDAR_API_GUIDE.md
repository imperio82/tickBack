# 📅 Guía de Integración - API de Calendario de Publicaciones

## 🎯 Descripción General

El sistema de calendario permite a los usuarios:
- ✅ Crear y gestionar publicaciones programadas
- ✅ Generar calendarios automáticos basados en análisis previos (SIN IA = GRATIS)
- ✅ Obtener horarios óptimos de publicación basados en data real
- ✅ Visualizar estadísticas de su calendario

**Base URL:** `http://localhost:3000/api/calendar`

**Autenticación:** Todos los endpoints requieren JWT Bearer Token

```javascript
headers: {
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 📊 Endpoints Disponibles

### 1️⃣ Posts Programados

#### **POST /calendar/posts** - Crear Post Programado

Crea una publicación programada individual.

**Request:**
```json
{
  "title": "Tutorial: 5 tips de marketing en TikTok",
  "description": "Aprende las mejores estrategias para crecer en TikTok",
  "hashtags": ["#marketing", "#tiktok", "#tips"],
  "platform": "tiktok",
  "scheduledDate": "2026-07-15T18:00:00Z",
  "status": "scheduled",
  "metadata": {
    "category": "educational",
    "targetAudience": "Creadores de contenido",
    "notes": "Usar gancho fuerte en los primeros 3 segundos"
  },
  "sendReminder": true,
  "reminderMinutesBefore": 30
}
```

**Response:**
```json
{
  "id": "uuid-123",
  "userId": "user-id",
  "title": "Tutorial: 5 tips de marketing en TikTok",
  "description": "Aprende las mejores estrategias...",
  "hashtags": ["#marketing", "#tiktok", "#tips"],
  "platform": "tiktok",
  "scheduledDate": "2026-07-15T18:00:00.000Z",
  "status": "scheduled",
  "metadata": {...},
  "sendReminder": true,
  "reminderMinutesBefore": 30,
  "createdAt": "2025-12-16T...",
  "updatedAt": "2025-12-16T..."
}
```

---

#### **GET /calendar/posts** - Listar Posts

Obtiene todos los posts programados del usuario con filtros opcionales.

**Query Params:**
- `startDate` (opcional): ISO date string - "2026-01-01"
- `endDate` (opcional): ISO date string - "2026-01-31"
- `status` (opcional): "draft" | "scheduled" | "published" | "cancelled"
- `platform` (opcional): "tiktok" | "instagram" | "youtube"

**Ejemplo:**
```
GET /calendar/posts?startDate=2026-01-01&endDate=2026-01-31&status=scheduled
```

**Response:**
```json
[
  {
    "id": "uuid-1",
    "title": "Video 1",
    "scheduledDate": "2026-01-05T18:00:00Z",
    "status": "scheduled",
    ...
  },
  {
    "id": "uuid-2",
    "title": "Video 2",
    "scheduledDate": "2026-01-08T21:00:00Z",
    "status": "scheduled",
    ...
  }
]
```

---

#### **GET /calendar/posts/upcoming** - Posts Próximos

Obtiene posts programados para los próximos N días (por defecto 7).

**Query Params:**
- `days` (opcional): número de días (default: 7)

**Ejemplo:**
```
GET /calendar/posts/upcoming?days=14
```

**Response:** Array de posts ordenados por fecha ascendente.

---

#### **GET /calendar/posts/:id** - Obtener Post por ID

**Ejemplo:**
```
GET /calendar/posts/uuid-123
```

**Response:** Objeto del post completo.

---

#### **PUT /calendar/posts/:id** - Actualizar Post

Actualiza un post existente.

**Request:**
```json
{
  "title": "Nuevo título",
  "scheduledDate": "2026-07-20T19:00:00Z",
  "status": "scheduled"
}
```

**Response:** Post actualizado.

---

#### **DELETE /calendar/posts/:id** - Eliminar Post

**Response:**
```json
{
  "success": true,
  "message": "Post eliminado correctamente"
}
```

---

#### **POST /calendar/posts/bulk** - Crear Múltiples Posts

Crea varios posts de una sola vez.

**Request:**
```json
{
  "posts": [
    {
      "title": "Post 1",
      "scheduledDate": "2026-01-05T18:00:00Z",
      ...
    },
    {
      "title": "Post 2",
      "scheduledDate": "2026-01-08T21:00:00Z",
      ...
    }
  ]
}
```

**Response:** Array de posts creados.

---

### 2️⃣ Horarios Óptimos (Sin IA)

#### **GET /calendar/optimal-hours** - Obtener Horarios Óptimos

Analiza tus scraping previos y retorna los mejores horarios para publicar.

**Query Params:**
- `analysisId` (opcional): ID de un análisis específico
- `topHours` (opcional): Cuántos horarios retornar (default: 10)

**Ejemplo:**
```
GET /calendar/optimal-hours?topHours=15
```

**Response:**
```json
[
  {
    "hour": 18,
    "dayOfWeek": 1,
    "averageEngagement": 0.056,
    "sampleSize": 45,
    "score": 100
  },
  {
    "hour": 21,
    "dayOfWeek": 1,
    "averageEngagement": 0.052,
    "sampleSize": 38,
    "score": 93
  },
  {
    "hour": 12,
    "dayOfWeek": 3,
    "averageEngagement": 0.048,
    "sampleSize": 42,
    "score": 86
  }
]
```

**Interpretación:**
- `hour`: Hora del día (0-23)
- `dayOfWeek`: Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
- `averageEngagement`: Engagement promedio en ese horario
- `sampleSize`: Cantidad de videos analizados
- `score`: Score normalizado 0-100 (100 = mejor horario)

---

### 3️⃣ Generación Automática de Calendario

#### **POST /calendar/generate** - Generar Calendario Completo

Genera un calendario completo de publicaciones automáticamente.

**Request:**
```json
{
  "calendarName": "Calendario Enero 2026",
  "description": "Plan de contenido para enero",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "postsPerWeek": 5,
  "strategy": "balanced",
  "preferredDays": [1, 3, 5],
  "preferredHours": [9, 12, 18, 21],
  "referenceAnalysisId": "analysis-uuid",
  "contentMix": {
    "educational": 50,
    "entertaining": 30,
    "promotional": 20
  }
}
```

**Parámetros:**
- `calendarName`: Nombre del calendario
- `startDate`: Fecha de inicio
- `endDate`: Fecha de fin
- `postsPerWeek`: Publicaciones por semana (1-21)
- `strategy` (opcional):
  - `"optimal_hours"`: Usa horarios óptimos del análisis
  - `"competitor_pattern"`: Copia patrón de competidor
  - `"balanced"`: Balanceado (default)
  - `"custom"`: Totalmente personalizado
- `preferredDays` (opcional): Array de días preferidos (0=Dom, 1=Lun, ...)
- `preferredHours` (opcional): Array de horas preferidas (formato 24h)
- `referenceAnalysisId` (opcional): ID del análisis para extraer horarios
- `contentMix` (opcional): Distribución de tipos de contenido (%)

**Response:**
```json
{
  "calendar": {
    "id": "calendar-uuid",
    "name": "Calendario Enero 2026",
    "strategy": "balanced",
    "configuration": {...},
    "statistics": {
      "totalPosts": 20,
      "distributionByDay": {
        "monday": 4,
        "wednesday": 4,
        "friday": 4,
        "tuesday": 4,
        "thursday": 4
      },
      "distributionByHour": {
        "9": 4,
        "12": 4,
        "18": 6,
        "21": 6
      },
      "averagePostsPerWeek": 5,
      "optimalHoursUsed": ["9:00", "12:00", "18:00", "21:00"]
    },
    "createdAt": "2025-12-16T..."
  },
  "posts": [
    {
      "id": "post-1",
      "title": "Tutorial 1: Tips prácticos",
      "scheduledDate": "2026-01-03T18:00:00Z",
      "status": "draft",
      "metadata": {
        "category": "educational",
        "notes": "Generado automáticamente"
      }
    },
    // ... más posts
  ]
}
```

---

#### **GET /calendar/calendars** - Listar Calendarios Creados

Lista todos los calendarios generados por el usuario.

**Response:**
```json
[
  {
    "id": "calendar-1",
    "name": "Calendario Enero 2026",
    "strategy": "balanced",
    "statistics": {...},
    "createdAt": "2025-12-15T..."
  },
  {
    "id": "calendar-2",
    "name": "Plan Q1 2026",
    "strategy": "optimal_hours",
    "statistics": {...},
    "createdAt": "2025-12-10T..."
  }
]
```

---

#### **GET /calendar/calendars/:id** - Obtener Calendario por ID

**Response:** Objeto del calendario completo con configuración y estadísticas.

---

#### **DELETE /calendar/calendars/:id** - Eliminar Calendario

**Response:**
```json
{
  "success": true,
  "message": "Calendario eliminado correctamente"
}
```

---

### 4️⃣ Estadísticas

#### **GET /calendar/statistics** - Estadísticas del Calendario

Retorna estadísticas sobre tus posts programados.

**Query Params:**
- `startDate` (opcional): ISO date string
- `endDate` (opcional): ISO date string

**Ejemplo:**
```
GET /calendar/statistics?startDate=2026-01-01&endDate=2026-03-31
```

**Response:**
```json
{
  "totalPosts": 45,
  "distributionByDay": {
    "sunday": 3,
    "monday": 9,
    "tuesday": 8,
    "wednesday": 9,
    "thursday": 7,
    "friday": 6,
    "saturday": 3
  },
  "distributionByHour": {
    "9": 8,
    "12": 10,
    "15": 5,
    "18": 12,
    "21": 10
  },
  "averagePostsPerWeek": 5.2,
  "optimalHoursUsed": ["9:00", "12:00", "18:00", "21:00"],
  "upcomingPosts": 38,
  "publishedPosts": 5,
  "draftPosts": 2
}
```

---

## 🎨 Ejemplos de Integración Frontend

### React/TypeScript

#### 1. Servicio API

```typescript
// src/services/calendarService.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
});

export const calendarService = {
  // Crear post
  async createPost(data: any) {
    const response = await axios.post(
      `${API_BASE}/calendar/posts`,
      data,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Obtener posts
  async getPosts(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const params = new URLSearchParams(filters as any);
    const response = await axios.get(
      `${API_BASE}/calendar/posts?${params}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Obtener horarios óptimos
  async getOptimalHours(topHours = 10) {
    const response = await axios.get(
      `${API_BASE}/calendar/optimal-hours?topHours=${topHours}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Generar calendario automático
  async generateCalendar(data: any) {
    const response = await axios.post(
      `${API_BASE}/calendar/generate`,
      data,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Obtener estadísticas
  async getStatistics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams({
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    });
    const response = await axios.get(
      `${API_BASE}/calendar/statistics?${params}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Actualizar post
  async updatePost(postId: string, data: any) {
    const response = await axios.put(
      `${API_BASE}/calendar/posts/${postId}`,
      data,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Eliminar post
  async deletePost(postId: string) {
    const response = await axios.delete(
      `${API_BASE}/calendar/posts/${postId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};
```

---

#### 2. Hook Personalizado

```typescript
// src/hooks/useCalendar.ts
import { useState, useEffect } from 'react';
import { calendarService } from '../services/calendarService';

export const useCalendar = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async (filters?: any) => {
    setLoading(true);
    try {
      const data = await calendarService.getPosts(filters);
      setPosts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData: any) => {
    setLoading(true);
    try {
      const newPost = await calendarService.createPost(postData);
      setPosts([...posts, newPost]);
      return newPost;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateCalendar = async (config: any) => {
    setLoading(true);
    try {
      const result = await calendarService.generateCalendar(config);
      setPosts(result.posts);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    createPost,
    generateCalendar,
  };
};
```

---

#### 3. Componente de Calendario

```typescript
// src/components/Calendar/CalendarView.tsx
import React, { useState } from 'react';
import { useCalendar } from '../../hooks/useCalendar';

export const CalendarView: React.FC = () => {
  const { posts, loading, generateCalendar } = useCalendar();
  const [generating, setGenerating] = useState(false);

  const handleGenerateCalendar = async () => {
    setGenerating(true);
    try {
      await generateCalendar({
        calendarName: 'Mi Calendario',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        postsPerWeek: 5,
        strategy: 'balanced',
      });
      alert('¡Calendario generado exitosamente!');
    } catch (error) {
      console.error(error);
      alert('Error al generar calendario');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="calendar-view">
      <header>
        <h1>Mi Calendario de Publicaciones</h1>
        <button
          onClick={handleGenerateCalendar}
          disabled={generating}
        >
          {generating ? 'Generando...' : 'Generar Calendario Automático'}
        </button>
      </header>

      <div className="posts-grid">
        {posts.map((post: any) => (
          <div key={post.id} className="post-card">
            <h3>{post.title}</h3>
            <p>{new Date(post.scheduledDate).toLocaleString()}</p>
            <span className={`badge ${post.status}`}>{post.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

#### 4. Visualización de Horarios Óptimos

```typescript
// src/components/OptimalHours/OptimalHoursChart.tsx
import React, { useEffect, useState } from 'react';
import { calendarService } from '../../services/calendarService';

export const OptimalHoursChart: React.FC = () => {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOptimalHours();
  }, []);

  const loadOptimalHours = async () => {
    try {
      const data = await calendarService.getOptimalHours(10);
      setHours(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando horarios óptimos...</div>;

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="optimal-hours-chart">
      <h2>🔥 Mejores Horarios para Publicar</h2>
      <p>Basado en análisis de tus videos con mejor engagement</p>

      <div className="hours-list">
        {hours.map((hour: any, index: number) => (
          <div key={index} className="hour-item">
            <div className="rank">#{index + 1}</div>
            <div className="time">
              {dayNames[hour.dayOfWeek]} a las {hour.hour}:00
            </div>
            <div className="score-bar">
              <div
                className="score-fill"
                style={{ width: `${hour.score}%` }}
              />
            </div>
            <div className="engagement">
              {(hour.averageEngagement * 100).toFixed(2)}% engagement
            </div>
            <div className="sample">
              {hour.sampleSize} videos analizados
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

#### 5. Formulario de Generación de Calendario

```typescript
// src/components/Calendar/GenerateCalendarForm.tsx
import React, { useState } from 'react';
import { calendarService } from '../../services/calendarService';

export const GenerateCalendarForm: React.FC = () => {
  const [form, setForm] = useState({
    calendarName: '',
    startDate: '',
    endDate: '',
    postsPerWeek: 5,
    strategy: 'balanced',
    contentMix: {
      educational: 50,
      entertaining: 30,
      promotional: 20,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await calendarService.generateCalendar(form);
      alert(`¡Calendario creado con ${result.posts.length} publicaciones!`);
      // Redirigir a vista de calendario
    } catch (error) {
      console.error(error);
      alert('Error al generar calendario');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="generate-calendar-form">
      <h2>Generar Calendario Automático</h2>

      <div className="form-group">
        <label>Nombre del Calendario</label>
        <input
          type="text"
          value={form.calendarName}
          onChange={(e) => setForm({ ...form, calendarName: e.target.value })}
          placeholder="Ej: Calendario Enero 2026"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Fecha Inicio</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Fecha Fin</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Publicaciones por Semana: {form.postsPerWeek}</label>
        <input
          type="range"
          min="1"
          max="14"
          value={form.postsPerWeek}
          onChange={(e) =>
            setForm({ ...form, postsPerWeek: parseInt(e.target.value) })
          }
        />
      </div>

      <div className="form-group">
        <label>Estrategia</label>
        <select
          value={form.strategy}
          onChange={(e) => setForm({ ...form, strategy: e.target.value })}
        >
          <option value="balanced">Balanceado (Recomendado)</option>
          <option value="optimal_hours">Horarios Óptimos</option>
          <option value="competitor_pattern">Patrón de Competidor</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      <div className="content-mix">
        <h3>Mix de Contenido (%)</h3>

        <div className="form-group">
          <label>Educativo: {form.contentMix.educational}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={form.contentMix.educational}
            onChange={(e) =>
              setForm({
                ...form,
                contentMix: {
                  ...form.contentMix,
                  educational: parseInt(e.target.value),
                },
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Entretenimiento: {form.contentMix.entertaining}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={form.contentMix.entertaining}
            onChange={(e) =>
              setForm({
                ...form,
                contentMix: {
                  ...form.contentMix,
                  entertaining: parseInt(e.target.value),
                },
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Promocional: {form.contentMix.promotional}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={form.contentMix.promotional}
            onChange={(e) =>
              setForm({
                ...form,
                contentMix: {
                  ...form.contentMix,
                  promotional: parseInt(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      <button type="submit" className="btn-primary">
        🚀 Generar Calendario
      </button>
    </form>
  );
};
```

---

## 📦 Tipos TypeScript

```typescript
// src/types/calendar.types.ts

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
}

export enum PostPlatform {
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
}

export interface ScheduledPost {
  id: string;
  userId: string;
  title: string;
  description?: string;
  hashtags: string[];
  platform: PostPlatform;
  scheduledDate: Date;
  status: PostStatus;
  metadata?: {
    videoUrl?: string;
    coverImageUrl?: string;
    duration?: number;
    category?: string;
    targetAudience?: string;
    notes?: string;
  };
  inspirationAnalysisId?: string;
  inspirationVideoId?: string;
  sendReminder: boolean;
  reminderMinutesBefore: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface OptimalHour {
  hour: number;
  dayOfWeek: number;
  averageEngagement: number;
  sampleSize: number;
  score: number;
}

export interface CalendarStatistics {
  totalPosts: number;
  distributionByDay: Record<string, number>;
  distributionByHour: Record<string, number>;
  averagePostsPerWeek: number;
  optimalHoursUsed: string[];
  upcomingPosts: number;
  publishedPosts: number;
  draftPosts: number;
}

export interface ContentCalendar {
  id: string;
  userId: string;
  name: string;
  description?: string;
  strategy: string;
  configuration: any;
  statistics?: CalendarStatistics;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🎨 Sugerencias de UI/UX

### Vista de Calendario

```
┌─────────────────────────────────────────────────────┐
│  📅 Mi Calendario de Publicaciones                   │
├─────────────────────────────────────────────────────┤
│  [Generar Automático] [Crear Post] [Horarios Óptimos]│
├─────────────────────────────────────────────────────┤
│  Enero 2026                          [< Mes >]       │
├───────┬───────┬───────┬───────┬───────┬───────┬─────┤
│  Dom  │  Lun  │  Mar  │  Mié  │  Jue  │  Vie  │ Sáb │
├───────┼───────┼───────┼───────┼───────┼───────┼─────┤
│       │       │       │   1   │   2   │   3   │  4  │
│       │       │       │       │ 18:00 │ 21:00 │     │
│       │       │       │       │ 📝    │ 📝    │     │
├───────┼───────┼───────┼───────┼───────┼───────┼─────┤
│   5   │   6   │   7   │   8   │   9   │  10   │ 11  │
│       │ 18:00 │       │ 21:00 │ 12:00 │ 18:00 │     │
│       │ 📝    │       │ 📝    │ 📝    │ 📝    │     │
└───────┴───────┴───────┴───────┴───────┴───────┴─────┘
```

### Panel de Estadísticas

```
┌──────────────────────────────────────────┐
│  📊 Estadísticas del Calendario          │
├──────────────────────────────────────────┤
│  Total Posts: 45                         │
│  Próximos: 38  |  Publicados: 5          │
│                                          │
│  Posts por Semana: 5.2                   │
│                                          │
│  Mejores Días:                           │
│  🥇 Lunes (9 posts)                      │
│  🥈 Miércoles (9 posts)                  │
│  🥉 Martes (8 posts)                     │
│                                          │
│  Mejores Horas:                          │
│  🔥 18:00 (12 posts)                     │
│  🔥 12:00 (10 posts)                     │
│  🔥 21:00 (10 posts)                     │
└──────────────────────────────────────────┘
```

---

## 🚀 Flujo de Usuario Recomendado

### 1. Primera Vez (Onboarding)

```
Usuario nuevo → Hacer análisis → Ir a Calendario
→ Ver "Horarios Óptimos" → Generar Calendario Automático
→ Editar posts según necesidad → ¡Listo!
```

### 2. Usuario Recurrente

```
Login → Dashboard → Ver "Posts Próximos" (widget)
→ Click en post → Editar/Publicar
→ Recibir recordatorio 30min antes
```

### 3. Power User

```
Ver Estadísticas → Identificar mejores horarios
→ Generar nuevo calendario con estrategia "optimal_hours"
→ Exportar a Google Calendar (futura feature)
```

---

## 💡 Tips de Implementación

### 1. **Caché en Frontend**

```typescript
// Cachear horarios óptimos (no cambian frecuentemente)
const cachedHours = localStorage.getItem('optimalHours');
if (cachedHours && isFresh(cachedHours)) {
  return JSON.parse(cachedHours);
}
```

### 2. **Optimistic Updates**

```typescript
// Al crear post, actualizar UI inmediatamente
setPosts([...posts, optimisticPost]);
try {
  const savedPost = await calendarService.createPost(data);
  // Reemplazar optimistic con real
  setPosts(posts.map(p => p.id === optimisticPost.id ? savedPost : p));
} catch (error) {
  // Revertir en caso de error
  setPosts(posts.filter(p => p.id !== optimisticPost.id));
}
```

### 3. **Drag & Drop para Calendario**

Usa librerías como `react-big-calendar` o `fullcalendar` para vista visual:

```bash
npm install react-big-calendar
```

```typescript
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

const localizer = momentLocalizer(moment);

<Calendar
  localizer={localizer}
  events={posts.map(p => ({
    title: p.title,
    start: new Date(p.scheduledDate),
    end: new Date(p.scheduledDate),
  }))}
  onSelectEvent={(event) => handleEditPost(event)}
  onSelectSlot={(slot) => handleCreatePost(slot.start)}
/>
```

---

## 🎁 Features Bonus

### 1. Exportar a Google Calendar

```typescript
async exportToGoogleCalendar(posts: ScheduledPost[]) {
  const icsContent = this.generateICS(posts);
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'tikmark-calendar.ics';
  a.click();
}

generateICS(posts: ScheduledPost[]): string {
  let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TikMark//Calendar//EN\n';

  posts.forEach(post => {
    ics += 'BEGIN:VEVENT\n';
    ics += `SUMMARY:${post.title}\n`;
    ics += `DTSTART:${this.formatICSDate(post.scheduledDate)}\n`;
    ics += `DESCRIPTION:${post.description || ''}\n`;
    ics += 'END:VEVENT\n';
  });

  ics += 'END:VCALENDAR';
  return ics;
}
```

### 2. Notificaciones Push

Integra con servicios como OneSignal o Firebase Cloud Messaging para enviar recordatorios.

### 3. Vista Kanban

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Draft      │  Scheduled   │  Today       │  Published   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ [Post 1]     │ [Post 3]     │ [Post 7]     │ [Post 10]    │
│ [Post 2]     │ [Post 4]     │ [Post 8]     │ [Post 11]    │
│              │ [Post 5]     │              │              │
│              │ [Post 6]     │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## ❓ FAQs

### ¿Cómo funciona la generación automática sin IA?

El sistema analiza los horarios de publicación de los videos con mejor engagement de tus análisis previos (o de competidores). No usa IA para generar el calendario, solo matemáticas simples:
1. Extrae hora de publicación de cada video
2. Calcula engagement promedio por hora/día
3. Ordena horarios por mejor rendimiento
4. Distribuye tus publicaciones en esos horarios

### ¿Qué pasa si no tengo análisis previos?

El sistema usa horarios por defecto basados en estudios generales de TikTok:
- Lunes-Jueves: 6pm, 9pm
- Viernes: 9pm
- Sábado: 11am
- Domingo: 7pm

### ¿Puedo editar el calendario generado?

¡Sí! El calendario genera posts en estado "draft". Puedes:
- Editar título, descripción, hashtags
- Cambiar fecha/hora
- Eliminar posts
- Agregar posts manualmente

### ¿Cuántos posts puedo programar?

Ilimitados. No hay restricción ya que no usa IA.

---

## 🎯 Métricas de Éxito (Para Producto)

Trackea estas métricas:
- % usuarios que usan calendario
- Promedio posts programados por usuario
- % usuarios que generan calendario automático
- Tasa de uso de horarios óptimos vs. aleatorio
- Engagement promedio de videos publicados con vs. sin calendario

---

## 🚀 ¡Listo para Integrar!

Con esta guía tienes todo lo necesario para integrar el calendario en tu frontend. El sistema está diseñado para ser:
- ✅ **Gratuito** (sin costos de IA)
- ✅ **Inteligente** (basado en data real)
- ✅ **Flexible** (permite personalización total)
- ✅ **Escalable** (soporta miles de posts)

**¿Dudas o necesitas ayuda con la integración? ¡Pregunta!**
