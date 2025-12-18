# 🎯 Sistema de Créditos - Implementación Completa

## 📊 Resumen de la Implementación

Se ha corregido e implementado completamente el sistema de créditos en **TikMark** con la siguiente fórmula:

```
✅ 1 CRÉDITO = 50 videos scrapeados + 4 videos analizados con IA
```

---

## 🔧 Cambios Realizados

### 1. **Profile Analysis** (`src/profile-analysis/profile-analysis.controller.ts`)

#### ✅ Endpoint: `POST /profile-analysis/scrape`
**Antes:**
- ❌ Consumía 1 crédito fijo sin importar cantidad de videos

**Ahora:**
- ✅ Calcula créditos basado en videos: `Math.ceil(videosAScrappear / 50)`
- ✅ 50 videos = 1 crédito
- ✅ 100 videos = 2 créditos
- ✅ 200 videos = 4 créditos

**Código:**
```typescript
const videosAScrappear = dto.resultsPerPage || 50;
const creditosNecesarios = Math.ceil(videosAScrappear / 50);
```

#### ✅ Endpoint: `POST /profile-analysis/:analysisId/analyze-videos`
**Antes:**
- ❌ Consumía 1 crédito POR CADA video (3 videos = 3 créditos)

**Ahora:**
- ✅ Calcula créditos basado en videos: `Math.ceil(videosAAnalizar / 4)`
- ✅ 4 videos = 1 crédito
- ✅ 8 videos = 2 créditos
- ✅ 12 videos = 3 créditos

**Código:**
```typescript
const videosAAnalizar = dto.selectedVideoIds.length;
const creditosNecesarios = Math.ceil(videosAAnalizar / 4);
```

---

### 2. **Competitor Analysis** (`src/competitor-analysis/competitor-analysis.controller.ts`)

**Antes:**
- ❌ **NO consumía créditos** (análisis ilimitados gratis)

**Ahora:**
- ✅ Todos los endpoints consumen créditos correctamente

#### ✅ Endpoint: `POST /competitor-analysis/competitors`

**Lógica de créditos:**
```typescript
const videosPerProfile = dto.videosPerProfile || 50;
const totalVideosAScrappear = dto.competitorProfiles.length * videosPerProfile;
const videosAAnalizar = dto.analyzeTop || 20;

const creditosScraping = Math.ceil(totalVideosAScrappear / 50);
const creditosAnalisis = Math.ceil(videosAAnalizar / 4);
const creditosNecesarios = creditosScraping + creditosAnalisis;
```

**Ejemplos:**
- 2 competidores × 50 videos + 20 videos analizados = 2 + 5 = **7 créditos**
- 3 competidores × 100 videos + 30 videos analizados = 6 + 8 = **14 créditos**

#### ✅ Endpoint: `POST /competitor-analysis/category`

**Lógica de créditos:**
```typescript
const videosAScrappear = dto.numberOfVideos || 200;
const videosAAnalizar = dto.analyzeTop || 30;

const creditosScraping = Math.ceil(videosAScrappear / 50);
const creditosAnalisis = Math.ceil(videosAAnalizar / 4);
const creditosNecesarios = creditosScraping + creditosAnalisis;
```

**Ejemplos:**
- 200 videos scrapeados + 30 analizados = 4 + 8 = **12 créditos**
- 500 videos scrapeados + 50 analizados = 10 + 13 = **23 créditos**

#### ✅ Endpoint: `POST /competitor-analysis/trending`

**Lógica de créditos:**
```typescript
const videosAScrappear = dto.numberOfVideos || 100;
const videosAAnalizar = dto.analyzeTop || 20;

const creditosScraping = Math.ceil(videosAScrappear / 50);
const creditosAnalisis = Math.ceil(videosAAnalizar / 4);
const creditosNecesarios = creditosScraping + creditosAnalisis;
```

**Ejemplos:**
- 100 videos scrapeados + 20 analizados = 2 + 5 = **7 créditos**

#### ✅ Endpoint: `POST /competitor-analysis/comparative`

**Lógica de créditos:**
```typescript
const videosPerProfile = dto.videosPerProfile || 50;
const totalProfiles = 1 + dto.competitorProfiles.length; // Tu perfil + competidores
const totalVideosAScrappear = totalProfiles * videosPerProfile;
const videosAAnalizar = 15 * 2; // Hace 2 análisis internos

const creditosScraping = Math.ceil(totalVideosAScrappear / 50);
const creditosAnalisis = Math.ceil(videosAAnalizar / 4);
const creditosNecesarios = creditosScraping + creditosAnalisis;
```

**Ejemplos:**
- Tu perfil + 2 competidores (150 videos) + 30 analizados = 3 + 8 = **11 créditos**

---

### 3. **Módulo de Créditos** (`src/competitor-analysis/competitor-analysis.module.ts`)

**Agregado:**
```typescript
import { CreditModule } from '../credits/credit.module';

@Module({
  imports: [
    // ...otros imports
    CreditModule, // ✅ Agregado
  ],
})
```

---

## 📋 Valor de los Paquetes de Créditos

Con la nueva lógica implementada, el valor real de cada paquete es:

| Paquete | Créditos | Precio | Valor Real |
|---------|----------|--------|------------|
| **Gratuito** | 3 | $0 | 150 videos scrapeados o 12 videos analizados |
| **Básico** | 20 | $15 | 1,000 videos scrapeados o 80 videos analizados |
| **Estándar** | 60 | $40 | 3,000 videos scrapeados o 240 videos analizados |
| **Premium** | 200 | $100 | 10,000 videos scrapeados o 800 videos analizados |

### Ejemplos de Uso Real:

**Paquete Gratuito (3 créditos):**
- ✅ 1 análisis de perfil (50 videos) + análisis de 8 videos = 3 créditos
- ✅ 1 análisis de categoría (150 videos) sin análisis IA = 3 créditos
- ✅ 12 videos analizados con IA = 3 créditos

**Paquete Básico (20 créditos):**
- ✅ 4 análisis de competidores (2 perfiles × 50 videos + 20 analizados) × 4 = 28... ❌ Insuficiente
- ✅ 2 análisis de competidores (2 perfiles × 50 videos + 20 analizados) = 14 créditos ✅ Sobran 6
- ✅ 1 análisis de categoría completo (200 videos + 30 analizados) = 12 créditos ✅ Sobran 8

**Paquete Estándar (60 créditos):**
- ✅ 5 análisis de categoría (200 videos + 30 analizados) = 60 créditos exactos
- ✅ 8 análisis de competidores (2 perfiles × 50 videos + 20 analizados) = 56 créditos ✅ Sobran 4

**Paquete Premium (200 créditos):**
- ✅ Análisis exhaustivo de un nicho completo
- ✅ 16 análisis de categoría (200 videos + 30 analizados) = 192 créditos
- ✅ 28 análisis de competidores = 196 créditos

---

## 🔍 Verificación de Descuento de Créditos

El sistema de créditos **SÍ descuenta correctamente** los créditos del usuario porque:

### ✅ `credit.service.ts:consumirCreditos()` (líneas 259-328)

```typescript
// 1. Obtiene el usuario
const usuario = await queryRunner.manager.findOne(Usuario, {
  where: { id: usuarioId },
});

// 2. Verifica créditos suficientes
if (usuario.creditosDisponibles < cantidad) {
  throw new BadRequestException('Créditos insuficientes');
}

// 3. Actualiza los créditos del usuario ✅
const balanceAnterior = usuario.creditosDisponibles;
const nuevoBalance = balanceAnterior - cantidad;

usuario.creditosDisponibles = nuevoBalance;        // ✅ Resta créditos
usuario.totalCreditosConsumidos += cantidad;       // ✅ Suma al total consumido

// 4. Guarda los cambios en la base de datos ✅
await queryRunner.manager.save(usuario);

// 5. Crea registro de transacción ✅
const transaccion = queryRunner.manager.create(CreditTransaction, {
  usuarioId,
  tipo: TipoTransaccionCredito.CONSUMO,
  cantidad: -cantidad,  // Negativo para consumo
  balanceAnterior,
  balanceResultante: nuevoBalance,
  descripcion,
  estado: EstadoTransaccion.COMPLETADA,
});

await queryRunner.manager.save(transaccion);
await queryRunner.commitTransaction();
```

### ✅ La entidad `Usuario` tiene los campos correctos:

```typescript
@Column({ type: 'int', default: 3 })
creditosDisponibles: number;          // ✅ Se actualiza

@Column({ type: 'int', default: 0 })
totalCreditosComprados: number;       // ✅ Suma en compras

@Column({ type: 'int', default: 0 })
totalCreditosConsumidos: number;      // ✅ Suma en consumos
```

---

## 🎯 Flujo Completo de Consumo de Créditos

### Ejemplo: Análisis de Categoría (200 videos + 30 analizados)

```
1. Usuario hace request: POST /competitor-analysis/category
   Body: { numberOfVideos: 200, analyzeTop: 30 }

2. Controller calcula créditos necesarios:
   creditosScraping = Math.ceil(200 / 50) = 4
   creditosAnalisis = Math.ceil(30 / 4) = 8
   creditosNecesarios = 4 + 8 = 12

3. Verifica créditos:
   creditService.verificarCreditos(userId, 12)
   → Consulta: usuario.creditosDisponibles >= 12

4. Si NO tiene créditos:
   → Lanza HttpException con status 402 (Payment Required)
   → Response: { creditosDisponibles: 5, creditosNecesarios: 12 }

5. Si SÍ tiene créditos:
   → creditService.consumirCreditos(userId, 12, descripcion)

6. Descuenta créditos (transacción atómica):
   a. Resta: usuario.creditosDisponibles -= 12
   b. Suma: usuario.totalCreditosConsumidos += 12
   c. Guarda usuario en DB
   d. Crea registro en credit_transactions
   e. Commit transaction

7. Ejecuta el análisis

8. Retorna resultado al usuario
```

---

## 📈 Mensajes de Error Mejorados

Todos los endpoints ahora retornan mensajes claros cuando faltan créditos:

```json
{
  "statusCode": 402,
  "message": "Créditos insuficientes. Necesitas 12 crédito(s) (4 scraping + 8 análisis) pero solo tienes 5.",
  "error": "Insufficient Credits",
  "creditosDisponibles": 5,
  "creditosNecesarios": 12,
  "desglose": {
    "scraping": 4,
    "analisis": 8,
    "videosAScrappear": 200,
    "videosAAnalizar": 30
  },
  "action": "buy_credits"
}
```

---

## ✅ Checklist de Implementación

- [x] Corregir consumo en `profile-analysis/scrape` (1 crédito = 50 videos)
- [x] Corregir consumo en `profile-analysis/analyze-videos` (1 crédito = 4 videos)
- [x] Agregar `CreditModule` a `CompetitorAnalysisModule`
- [x] Inyectar `CreditService` en `CompetitorAnalysisController`
- [x] Implementar consumo en `POST /competitor-analysis/competitors`
- [x] Implementar consumo en `POST /competitor-analysis/category`
- [x] Implementar consumo en `POST /competitor-analysis/trending`
- [x] Implementar consumo en `POST /competitor-analysis/comparative`
- [x] Verificar que `consumirCreditos()` descuenta correctamente
- [x] Agregar mensajes de error descriptivos
- [x] Documentar sistema completo

---

## 🚀 Próximos Pasos (Opcional)

### Mejoras Sugeridas:

1. **Dashboard de Créditos:**
   - Mostrar gráfico de consumo histórico
   - Predicción de cuándo se quedarán sin créditos
   - Sugerencias de paquetes según uso

2. **Optimizaciones:**
   - Caché de análisis previos para reducir consumo
   - Paquetes personalizados basados en uso
   - Sistema de referidos (regalar créditos)

3. **Notificaciones:**
   - Email cuando quedan 10% de créditos
   - Notificación cuando se agotan
   - Recordatorio de paquete gratuito mensual

4. **Analytics:**
   - Métricas de qué tipo de análisis consume más
   - ROI de cada paquete
   - Tasa de conversión de gratuito a pago

---

## 📞 Contacto

Si encuentras algún bug o tienes sugerencias, por favor reporta en el repositorio.

---

**Última actualización:** 2025-12-17
**Versión:** 1.0.0
**Estado:** ✅ Implementación Completa
