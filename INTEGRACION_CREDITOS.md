# 🔍 Análisis del Sistema Actual de Créditos

## 📊 Estado Actual

### ✅ Lo que YA ESTÁ implementado:

#### 1. **Asignación de Plan al Usuario** (src/user/user.service.ts:87-92)

```typescript
// Al crear un usuario, se asigna automáticamente:
const nuevoUsuario = this.usuarioRepository.create({
  ...createUsuarioDto,
  password: hashedPassword,
  estado: EstadoUsuario.ACTIVO,
  tipoSuscripcion: TipoSuscripcion.GRATUITA,  // ← Plan por defecto
});
```

**Y además se asignan 3 créditos gratis** (línea 93-100):
- Por defecto en la entidad: `creditosDisponibles: number (default: 3)`

#### 2. **Sistema de Suscripción Antiguo** (TODAVÍA ACTIVO)

**Endpoint:** `PUT /user/:id/incrementar-busquedas`
- Ubicación: `src/user/user.controller.ts:354-363`
- Servicio: `src/user/user.service.ts:316-344`

```typescript
async incrementarBusquedas(id: string): Promise<void> {
  const usuario = await this.usuarioRepository.findOne({ where: { id } });

  // ⚠️ Verifica límites del plan antiguo
  if (usuario.busquedasUtilizadasMes >= usuario.limiteBusquedasMes) {
    throw new BadRequestException('Límite de búsquedas mensuales alcanzado');
  }

  usuario.busquedasUtilizadasMes++;  // ← Incrementa contador
  await this.usuarioRepository.save(usuario);
}
```

**Límites por plan antiguo:**
- GRATUITA: 10 búsquedas/mes
- BASICA: 50 búsquedas/mes
- PREMIUM: 200 búsquedas/mes
- EMPRESARIAL: 1000 búsquedas/mes

---

### ❌ Lo que NO está implementado aún:

#### **Los análisis NO están consumiendo créditos del nuevo sistema**

**Ubicación de los análisis:**
- `src/profile-analysis/profile-analysis.controller.ts`

**Endpoints que deberían consumir créditos:**

1. **`POST /profile-analysis/scrape`** (línea 69)
   - Scrapea un perfil de TikTok
   - **NO consume créditos** ❌

2. **`POST /profile-analysis/:analysisId/analyze-videos`** (línea 298)
   - Analiza videos seleccionados
   - **NO consume créditos** ❌

3. **`POST /profile-analysis/:analysisId/regenerate-insights/:jobId`** (no revisado aún)
   - Regenera insights
   - **NO consume créditos** ❌

---

## 🎯 Cómo Integrar el Sistema de Créditos

### Opción A: Consumir créditos en el CONTROLADOR (Recomendado)

#### 1. Actualizar el módulo ProfileAnalysisModule

**Archivo:** `src/profile-analysis/profile-analysis.module.ts`

```typescript
import { CreditModule } from '../credits/credit.module';

@Module({
  imports: [
    CreditModule,  // ← AGREGAR ESTO
    // ... otros imports
  ],
  // ...
})
export class ProfileAnalysisModule {}
```

#### 2. Inyectar CreditService en el controlador

**Archivo:** `src/profile-analysis/profile-analysis.controller.ts`

```typescript
import { CreditService } from '../credits/credit.service';

@Controller('profile-analysis')
export class ProfileAnalysisController {
  constructor(
    // ... otros servicios
    private readonly creditService: CreditService,  // ← AGREGAR
  ) {}

  // ... métodos
}
```

#### 3. Consumir créditos en scrapeProfile

**ANTES (líneas 69-92):**
```typescript
async scrapeProfile(
  @Body() dto: ScrapeProfileDto,
  @Request() req
): Promise<ScrapeProfileResponseDto> {
  try {
    const userId: string = req.user.userId;
    this.logger.log(`[${userId}] Iniciando scraping de perfil: ${dto.profileUrl}`);

    // 1. Crear ProfileAnalysis
    const profileAnalysis = await this.profileAnalysisService.create({
      userId,
      profileUrl: dto.profileUrl,
      status: ProfileAnalysisStatus.SCRAPING,
    });

    // 2. Ejecutar scraping...
    // ...
  }
}
```

**DESPUÉS (con consumo de créditos):**
```typescript
async scrapeProfile(
  @Body() dto: ScrapeProfileDto,
  @Request() req
): Promise<ScrapeProfileResponseDto> {
  try {
    const userId: string = req.user.userId;
    this.logger.log(`[${userId}] Iniciando scraping de perfil: ${dto.profileUrl}`);

    // ====== VERIFICAR Y CONSUMIR CRÉDITOS ======
    // 1. Verificar créditos disponibles
    const tieneCreditos = await this.creditService.verificarCreditos(userId, 1);
    if (!tieneCreditos) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: 'Créditos insuficientes. Por favor compra más créditos para continuar.',
          error: 'Insufficient Credits',
          action: 'buy_credits', // Para que el frontend sepa qué hacer
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    // 2. Consumir 1 crédito
    await this.creditService.consumirCreditos(
      userId,
      1,
      `Scraping de perfil: ${dto.profileUrl}`,
      null // Sin recursoId aún, lo actualizaremos después
    );

    this.logger.log(`[${userId}] 1 crédito consumido. Iniciando scraping...`);
    // ==========================================

    // 3. Crear ProfileAnalysis (como antes)
    const profileAnalysis = await this.profileAnalysisService.create({
      userId,
      profileUrl: dto.profileUrl,
      status: ProfileAnalysisStatus.SCRAPING,
    });

    // 4. Ejecutar scraping...
    // ... resto del código igual
  }
}
```

#### 4. Consumir créditos en analyzeVideos

**AGREGAR en línea 305 (después de obtener userId):**

```typescript
async analyzeVideos(
  @Param('analysisId') analysisId: string,
  @Body() dto: AnalyzeVideosDto,
  @Request() req
): Promise<AnalyzeVideosResponseDto> {
  try {
    const userId: string = req.user.userId;
    this.logger.log(`[${userId}] Iniciando análisis de videos: ${analysisId}`);

    // ====== VERIFICAR Y CONSUMIR CRÉDITOS ======
    const creditosNecesarios = dto.selectedVideoIds.length; // 1 crédito por video

    const tieneCreditos = await this.creditService.verificarCreditos(
      userId,
      creditosNecesarios
    );

    if (!tieneCreditos) {
      const balance = await this.creditService.obtenerBalance(userId);
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Créditos insuficientes. Necesitas ${creditosNecesarios} créditos, pero solo tienes ${balance.creditosDisponibles}.`,
          error: 'Insufficient Credits',
          required: creditosNecesarios,
          available: balance.creditosDisponibles,
          action: 'buy_credits',
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    // Consumir créditos
    await this.creditService.consumirCreditos(
      userId,
      creditosNecesarios,
      `Análisis de ${creditosNecesarios} videos - Perfil: ${analysisId}`,
      analysisId
    );

    this.logger.log(
      `[${userId}] ${creditosNecesarios} créditos consumidos para análisis de videos`
    );
    // ==========================================

    // Resto del código igual...
    const profileAnalysis = await this.profileAnalysisService.findById(analysisId, userId);
    // ...
  }
}
```

---

## 📤 Información al Frontend

### Endpoints que YA están disponibles para el frontend:

#### 1. **Balance de créditos**
```http
GET /credits/balance/:userId
```
**Respuesta:**
```json
{
  "usuarioId": "uuid",
  "creditosDisponibles": 15,
  "totalComprados": 60,
  "totalConsumidos": 45
}
```

#### 2. **Historial de consumo**
```http
GET /credits/history/:userId?page=1&limit=10
```
**Respuesta:**
```json
{
  "transacciones": [
    {
      "id": "uuid",
      "tipo": "consumo",
      "cantidad": -1,
      "descripcion": "Análisis de perfil @username",
      "balanceResultante": 14,
      "creadoEn": "2025-12-09T20:00:00Z"
    }
  ],
  "total": 45,
  "pagina": 1,
  "limite": 10
}
```

#### 3. **Estadísticas**
```http
GET /credits/stats/:userId
```
**Respuesta:**
```json
{
  "usuarioId": "uuid",
  "creditosDisponibles": 15,
  "totalComprados": 60,
  "totalConsumidos": 45,
  "ultimaCompra": "2025-12-01T10:00:00Z",
  "ultimoConsumo": "2025-12-09T20:00:00Z",
  "totalTransacciones": 50
}
```

#### 4. **Información del usuario (incluye créditos)**
```http
GET /user/:id
```
**Respuesta actual NO incluye créditos** ❌

**Necesita actualización:**

**Archivo:** `src/user/user.service.ts:406-417`

**ANTES:**
```typescript
private mapearAResponse(usuario: Usuario): UsuarioResponseDto {
  return {
    id: usuario.id,
    email: usuario.email,
    username: usuario.username,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    estado: usuario.estado,
    tipoSuscripcion: usuario.tipoSuscripcion,
    creadoEn: usuario.creadoEn,
  };
}
```

**DESPUÉS:**
```typescript
private mapearAResponse(usuario: Usuario): UsuarioResponseDto {
  return {
    id: usuario.id,
    email: usuario.email,
    username: usuario.username,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    estado: usuario.estado,
    tipoSuscripcion: usuario.tipoSuscripcion,
    creadoEn: usuario.creadoEn,
    // AGREGAR campos de créditos
    creditosDisponibles: usuario.creditosDisponibles,
    totalCreditosComprados: usuario.totalCreditosComprados,
    totalCreditosConsumidos: usuario.totalCreditosConsumidos,
  };
}
```

**Y actualizar el DTO:**

**Archivo:** `src/user/dto/userDto.ts:196-246`

```typescript
export class UsuarioResponseDto {
  // ... campos existentes

  @ApiProperty({
    description: 'Créditos disponibles actuales',
    example: 15
  })
  creditosDisponibles: number;

  @ApiProperty({
    description: 'Total de créditos comprados',
    example: 60
  })
  totalCreditosComprados: number;

  @ApiProperty({
    description: 'Total de créditos consumidos',
    example: 45
  })
  totalCreditosConsumidos: number;
}
```

---

## 🎨 Recomendaciones para el Frontend

### 1. **Mostrar créditos en el header/navbar**
```jsx
// Llamar al endpoint al cargar la app
const { data: balance } = useQuery(['credits', userId], () =>
  fetch(`/credits/balance/${userId}`).then(r => r.json())
);

<Header>
  <CreditDisplay>
    <CoinIcon />
    {balance?.creditosDisponibles || 0} créditos
  </CreditDisplay>
</Header>
```

### 2. **Advertencia antes de acciones que consumen créditos**
```jsx
// Antes de hacer scraping
const handleScrapeProfile = async () => {
  if (balance.creditosDisponibles < 1) {
    showModal({
      title: 'Créditos insuficientes',
      message: 'Necesitas 1 crédito para scrapear un perfil. ¿Deseas comprar más?',
      actions: [
        { label: 'Comprar créditos', onClick: () => router.push('/buy-credits') },
        { label: 'Cancelar' }
      ]
    });
    return;
  }

  // Proceder con scraping...
};
```

### 3. **Manejar error 402 (Payment Required)**
```jsx
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 402) {
      // Créditos insuficientes
      showNotification({
        type: 'warning',
        title: 'Créditos insuficientes',
        message: error.response.data.message,
        action: {
          label: 'Comprar créditos',
          onClick: () => router.push('/buy-credits')
        }
      });
    }
    return Promise.reject(error);
  }
);
```

### 4. **Historial de consumo**
```jsx
const HistorialCreditos = () => {
  const { data } = useQuery(['credit-history', userId], () =>
    fetch(`/credits/history/${userId}?page=1&limit=20`).then(r => r.json())
  );

  return (
    <div>
      <h3>Historial de Créditos</h3>
      {data?.transacciones.map(tx => (
        <TransactionItem key={tx.id}>
          <Icon type={tx.tipo} />
          <Description>{tx.descripcion}</Description>
          <Amount negative={tx.cantidad < 0}>
            {tx.cantidad > 0 ? '+' : ''}{tx.cantidad}
          </Amount>
          <Balance>{tx.balanceResultante} créditos</Balance>
          <Date>{formatDate(tx.creadoEn)}</Date>
        </TransactionItem>
      ))}
    </div>
  );
};
```

---

## 📋 Checklist de Implementación

### Backend
- [ ] Actualizar `ProfileAnalysisModule` para importar `CreditModule`
- [ ] Inyectar `CreditService` en `ProfileAnalysisController`
- [ ] Agregar verificación/consumo en `scrapeProfile` endpoint
- [ ] Agregar verificación/consumo en `analyzeVideos` endpoint
- [ ] Actualizar `UsuarioResponseDto` para incluir créditos
- [ ] Actualizar método `mapearAResponse` en `UserService`
- [ ] (Opcional) Agregar consumo en endpoint de regenerar insights

### Frontend
- [ ] Mostrar balance de créditos en header/navbar
- [ ] Llamar a `/credits/balance/:userId` al iniciar sesión
- [ ] Agregar interceptor para manejar error 402
- [ ] Crear página de compra de créditos
- [ ] Mostrar advertencia antes de acciones que consumen créditos
- [ ] Crear página de historial de créditos
- [ ] Agregar indicador de créditos necesarios en cada acción

### Testing
- [ ] Probar flujo completo: registrar → scrapear (consume crédito) → verificar balance
- [ ] Probar error cuando no hay créditos suficientes
- [ ] Probar compra de créditos
- [ ] Probar historial de transacciones

---

## 🚨 Importante

**Sistema Dual Actual:**
Tu aplicación tiene DOS sistemas funcionando en paralelo:

1. **Sistema antiguo de suscripciones** (limiteBusquedasMes, busquedasUtilizadasMes)
2. **Sistema nuevo de créditos** (creditosDisponibles)

**Recomendación:** Decide si quieres:
- **Opción A:** Migrar completamente a créditos (eliminar sistema antiguo)
- **Opción B:** Mantener ambos (usuarios legacy con suscripción, nuevos con créditos)
- **Opción C:** Combinar ambos (suscripción + paquetes de créditos adicionales)

Si eliges la **Opción A**, deberás:
1. Eliminar métodos `incrementarBusquedas`, `actualizarSuscripcion`
2. Eliminar campos `limiteBusquedasMes`, `busquedasUtilizadasMes` de la entidad
3. Actualizar todos los análisis para usar solo créditos
