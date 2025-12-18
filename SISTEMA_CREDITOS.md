# 💳 Sistema de Créditos - Documentación

## 📋 Resumen

Se ha implementado un sistema completo de créditos que reemplaza el sistema de suscripciones mensuales. Los usuarios ahora compran paquetes de créditos que consumen al realizar análisis.

## 💰 Paquetes de Créditos

| Paquete | Precio | Créditos | Descripción |
|---------|--------|----------|-------------|
| **Gratuito** | $0 | 3 | Perfecto para probar la plataforma |
| **Básico** | $15 | 20 | Ideal para análisis esporádicos |
| **Estándar** | $40 | 60 | Para análisis regulares (Más Popular) |
| **Premium** | $100 | 200 | Máxima capacidad para análisis intensivos |

## 🗂️ Estructura del Código

```
src/
├── credits/
│   ├── entities/
│   │   ├── credit-package.entity.ts      # Paquetes de créditos disponibles
│   │   └── credit-transaction.entity.ts   # Historial de transacciones
│   ├── credit.service.ts                  # Lógica de negocio de créditos
│   ├── credit.controller.ts               # Endpoints REST
│   └── credit.module.ts                   # Módulo de créditos
├── user/
│   ├── dto/
│   │   ├── creditDto.ts                   # DTOs de créditos
│   │   └── enums.ts                       # Enums actualizados
│   └── user.Entity/
│       └── user.Entity.ts                 # Usuario con campos de créditos
```

## 🎯 Nuevos Campos en Usuario

```typescript
// Créditos disponibles actuales
creditosDisponibles: number (default: 3)

// Total de créditos comprados históricamente
totalCreditosComprados: number (default: 0)

// Total de créditos consumidos históricamente
totalCreditosConsumidos: number (default: 0)
```

## 🔌 API Endpoints

### Paquetes de Créditos

#### `GET /credits/packages`
Obtiene todos los paquetes de créditos disponibles.

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "tipo": "basico",
    "nombre": "Paquete Básico",
    "creditos": 20,
    "precio": 15,
    "descripcion": "Ideal para análisis esporádicos",
    "activo": true
  }
]
```

#### `POST /credits/packages/initialize`
Inicializa los paquetes de créditos en la base de datos.

**Uso:** Solo ejecutar una vez al desplegar.

### Compra de Créditos

#### `POST /credits/purchase/:userId`
Compra un paquete de créditos.

**Body:**
```json
{
  "tipoPaquete": "basico",
  "pagoId": "txn_123456",
  "metodoPago": "stripe"
}
```

**Respuesta:**
```json
{
  "id": "uuid",
  "usuarioId": "uuid",
  "tipo": "compra",
  "cantidad": 20,
  "balanceResultante": 23,
  "descripcion": "Compra de Paquete Básico (20 créditos)",
  "estado": "completada",
  "creadoEn": "2025-12-09T20:00:00Z"
}
```

### Consumo de Créditos

#### `POST /credits/consume/:userId`
Consume créditos del usuario.

**Body:**
```json
{
  "cantidad": 1,
  "descripcion": "Análisis de perfil @username",
  "recursoId": "analysis-uuid"
}
```

**Respuesta:**
```json
{
  "id": "uuid",
  "usuarioId": "uuid",
  "tipo": "consumo",
  "cantidad": -1,
  "balanceResultante": 22,
  "descripcion": "Análisis de perfil @username",
  "estado": "completada",
  "creadoEn": "2025-12-09T20:30:00Z"
}
```

#### `GET /credits/check/:userId/:cantidad`
Verifica si el usuario tiene créditos suficientes.

**Respuesta:**
```json
{
  "tieneCreditos": true,
  "mensaje": "Créditos suficientes"
}
```

### Regalos

#### `POST /credits/gift/:userId`
Regala créditos a otro usuario.

**Body:**
```json
{
  "usuarioDestinoId": "uuid",
  "cantidad": 5,
  "mensaje": "Regalo de bienvenida"
}
```

### Consultas

#### `GET /credits/balance/:userId`
Obtiene el balance actual de créditos.

**Respuesta:**
```json
{
  "usuarioId": "uuid",
  "creditosDisponibles": 22,
  "totalComprados": 40,
  "totalConsumidos": 18
}
```

#### `GET /credits/history/:userId?page=1&limit=10`
Obtiene el historial de transacciones paginado.

**Respuesta:**
```json
{
  "transacciones": [...],
  "total": 15,
  "pagina": 1,
  "limite": 10
}
```

#### `GET /credits/stats/:userId`
Obtiene estadísticas detalladas.

**Respuesta:**
```json
{
  "usuarioId": "uuid",
  "creditosDisponibles": 22,
  "totalComprados": 40,
  "totalConsumidos": 18,
  "ultimaCompra": "2025-12-01T10:00:00Z",
  "ultimoConsumo": "2025-12-09T20:30:00Z",
  "totalTransacciones": 15
}
```

## 🚀 Migración e Implementación

### Paso 1: Inicializar Paquetes

Ejecuta este endpoint una sola vez para crear los paquetes en la base de datos:

```bash
POST http://localhost:3000/credits/packages/initialize
```

### Paso 2: Integrar Consumo en Análisis

Para cada punto donde se realiza un análisis, agrega el consumo de créditos:

```typescript
import { CreditService } from '../credits/credit.service';

// En tu servicio de análisis
constructor(
  private readonly creditService: CreditService,
) {}

async realizarAnalisis(userId: string, profileUrl: string) {
  // 1. Verificar créditos
  const tieneCreditos = await this.creditService.verificarCreditos(userId, 1);

  if (!tieneCreditos) {
    throw new BadRequestException(
      'Créditos insuficientes. Por favor compra más créditos.'
    );
  }

  // 2. Consumir crédito
  await this.creditService.consumirCreditos(
    userId,
    1,
    `Análisis de perfil ${profileUrl}`,
    analysisId
  );

  // 3. Realizar el análisis
  const resultado = await this.hacerAnalisis(profileUrl);

  return resultado;
}
```

### Paso 3: Actualizar Módulos

Importa `CreditModule` en los módulos que necesiten consumir créditos:

```typescript
import { CreditModule } from '../credits/credit.module';

@Module({
  imports: [
    CreditModule, // Importar aquí
    // otros módulos...
  ],
  // ...
})
export class ProfileAnalysisModule {}
```

### Paso 4: Integración con Pasarela de Pago

Para integrar con Stripe, PayPal u otra pasarela:

```typescript
// Ejemplo con Stripe
async procesarPagoStripe(userId: string, tipoPaquete: TipoPaqueteCredito) {
  // 1. Obtener paquete
  const paquete = await this.creditService.obtenerPaquetePorTipo(tipoPaquete);

  // 2. Crear sesión de pago en Stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: paquete.nombre,
          description: paquete.descripcion,
        },
        unit_amount: paquete.precio * 100, // Stripe usa centavos
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN}/cancel`,
  });

  return { sessionId: session.id };
}

// Webhook de Stripe cuando el pago es exitoso
async handleStripeWebhook(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Otorgar créditos al usuario
    await this.creditService.comprarCreditos(
      session.client_reference_id, // userId
      tipoPaquete,
      session.payment_intent,
      'stripe'
    );
  }
}
```

## 📊 Base de Datos

### Migraciones

El sistema usa `synchronize: true`, por lo que las tablas se crearán automáticamente:

- `credit_packages` - Paquetes disponibles
- `credit_transactions` - Historial de transacciones
- `usuarios` - Tabla actualizada con campos de créditos

### Índices Creados

```sql
-- Paquetes
CREATE INDEX idx_credit_packages_tipo ON credit_packages(tipo);

-- Transacciones
CREATE INDEX idx_transactions_usuario_fecha ON credit_transactions(usuarioId, creadoEn);
CREATE INDEX idx_transactions_tipo_estado ON credit_transactions(tipo, estado);
CREATE INDEX idx_transactions_fecha ON credit_transactions(creadoEn);
```

## 🔒 Validaciones

El sistema incluye:

✅ Validación de créditos antes de consumo
✅ Transacciones atómicas (rollback en caso de error)
✅ Prevención de uso múltiple del paquete gratuito
✅ Validación de cantidades positivas
✅ Verificación de existencia de usuarios
✅ Control de concurrencia con transacciones de base de datos

## 📝 Ejemplos de Uso

### Flujo Completo de Usuario

```typescript
// 1. Usuario se registra (obtiene 3 créditos gratis automáticamente)
POST /user
Body: { email, username, password, nombre, apellido }

// 2. Usuario verifica su balance
GET /credits/balance/:userId
Response: { creditosDisponibles: 3, ... }

// 3. Usuario realiza análisis (consume 1 crédito)
POST /profile-analysis/scrape
Body: { profileUrl }
// Internamente consume 1 crédito

// 4. Usuario verifica balance actualizado
GET /credits/balance/:userId
Response: { creditosDisponibles: 2, ... }

// 5. Usuario compra más créditos
POST /credits/purchase/:userId
Body: { tipoPaquete: "basico", pagoId: "txn_123", metodoPago: "stripe" }

// 6. Usuario consulta historial
GET /credits/history/:userId?page=1&limit=10
```

## 🎨 Frontend - Sugerencias de UI

### Dashboard de Créditos

```jsx
// Componente de balance
<CreditBalance>
  <h3>Tus Créditos</h3>
  <p className="credits-available">
    {creditosDisponibles} créditos disponibles
  </p>
  <Button onClick={comprarCreditos}>
    Comprar más créditos
  </Button>
</CreditBalance>

// Selector de paquetes
<PackageSelector>
  {packages.map(pkg => (
    <PackageCard key={pkg.id} destacado={pkg.metadata.destacado}>
      <h4>{pkg.nombre}</h4>
      <p className="price">${pkg.precio}</p>
      <p className="credits">{pkg.creditos} créditos</p>
      <span className="badge">{pkg.metadata.etiqueta}</span>
      <ul>
        {pkg.metadata.caracteristicas.map(f => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <Button onClick={() => comprar(pkg.tipo)}>
        Comprar
      </Button>
    </PackageCard>
  ))}
</PackageSelector>
```

## 🐛 Troubleshooting

### "Créditos insuficientes"
- Verificar balance: `GET /credits/balance/:userId`
- Comprar más créditos o usar paquete gratuito si no lo ha usado

### "Ya has utilizado tu paquete gratuito"
- El paquete gratuito solo se puede usar una vez por usuario
- Comprar un paquete de pago

### Errores de transacción
- Verificar logs del servidor
- Revisar que las entidades estén sincronizadas
- Verificar conexión a base de datos

## 📈 Métricas y Analytics

Consultas útiles para analytics:

```sql
-- Total de créditos vendidos
SELECT SUM(cantidad) FROM credit_transactions WHERE tipo = 'compra';

-- Paquete más popular
SELECT paqueteId, COUNT(*) as ventas
FROM credit_transactions
WHERE tipo = 'compra'
GROUP BY paqueteId
ORDER BY ventas DESC;

-- Usuarios más activos
SELECT usuarioId, COUNT(*) as analisis
FROM credit_transactions
WHERE tipo = 'consumo'
GROUP BY usuarioId
ORDER BY analisis DESC
LIMIT 10;
```

## 🔮 Próximas Mejoras

- [ ] Sistema de suscripciones recurrentes (créditos mensuales)
- [ ] Créditos con expiración
- [ ] Promociones y cupones de descuento
- [ ] Programa de referidos (créditos gratis)
- [ ] Paquetes personalizados para empresas
- [ ] Dashboard de admin para gestión de créditos
- [ ] Notificaciones cuando se acaben los créditos
- [ ] Auto-recarga de créditos

---

**¿Preguntas?** Revisa los logs del servidor o consulta la documentación de NestJS y TypeORM.
