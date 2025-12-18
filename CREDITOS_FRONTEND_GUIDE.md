# 💳 Guía Frontend - Sistema de Créditos

Guía completa para implementar el sistema de créditos en el frontend y proporcionar feedback claro al usuario.

---

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Servicio de Créditos](#servicio-de-créditos)
3. [Hooks Personalizados](#hooks-personalizados)
4. [Componentes UI](#componentes-ui)
5. [Manejo de Errores](#manejo-de-errores)
6. [Ejemplos de Integración](#ejemplos-de-integración)

---

## Configuración Inicial

### Instalación de Dependencias

```bash
npm install axios react-query
```

### Tipos TypeScript

```typescript
// src/types/credits.types.ts

export interface CreditBalance {
  usuarioId: string;
  creditosDisponibles: number;
  totalComprados: number;
  totalConsumidos: number;
}

export interface CreditPackage {
  id: string;
  tipo: 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM';
  nombre: string;
  descripcion: string;
  creditos: number;
  precio: number;
  activo: boolean;
  metadata?: {
    destacado?: boolean;
    etiqueta?: string;
    caracteristicas?: string[];
  };
}

export interface CreditTransaction {
  id: string;
  tipo: 'COMPRA' | 'CONSUMO' | 'REGALO' | 'REEMBOLSO';
  cantidad: number;
  balanceAnterior: number;
  balanceResultante: number;
  descripcion: string;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'FALLIDA';
  creadoEn: string;
  paquete?: CreditPackage;
}

export interface InsufficientCreditsError {
  statusCode: 402;
  message: string;
  error: 'Insufficient Credits';
  creditosDisponibles: number;
  creditosNecesarios: number;
  desglose?: {
    scraping: number;
    analisis: number;
    videosAScrappear?: number;
    videosAAnalizar?: number;
  };
  action: 'buy_credits';
}

export interface CreditEstimate {
  scraping: number;
  analisis: number;
  total: number;
  tieneCreditos: boolean;
  creditosFaltantes: number;
}
```

---

## Servicio de Créditos

```typescript
// src/services/creditService.ts

import api from '../config/axios';
import type {
  CreditBalance,
  CreditPackage,
  CreditTransaction,
  CreditEstimate,
} from '../types/credits.types';

export const creditService = {
  /**
   * Obtener balance de créditos del usuario
   */
  async getBalance(): Promise<CreditBalance> {
    const response = await api.get('/credits/balance');
    return response.data;
  },

  /**
   * Obtener paquetes disponibles
   */
  async getPackages(): Promise<CreditPackage[]> {
    const response = await api.get('/credits/packages');
    return response.data;
  },

  /**
   * Comprar paquete de créditos
   */
  async purchasePackage(
    tipoPaquete: string,
    pagoId?: string,
    metodoPago?: string
  ): Promise<CreditTransaction> {
    const response = await api.post('/credits/purchase', {
      tipoPaquete,
      pagoId,
      metodoPago,
    });
    return response.data;
  },

  /**
   * Obtener historial de transacciones
   */
  async getHistory(page: number = 1, limit: number = 10) {
    const response = await api.get('/credits/history', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Verificar si tiene créditos suficientes
   */
  async checkCredits(cantidad: number): Promise<boolean> {
    const response = await api.get('/credits/check', {
      params: { cantidad },
    });
    return response.data.tieneCreditos;
  },

  /**
   * Estimar créditos necesarios para una operación
   */
  estimateCredits(params: {
    videosAScrappear: number;
    videosAAnalizar: number;
    creditosDisponibles: number;
  }): CreditEstimate {
    const scraping = Math.ceil(params.videosAScrappear / 50);
    const analisis = Math.ceil(params.videosAAnalizar / 4);
    const total = scraping + analisis;
    const tieneCreditos = params.creditosDisponibles >= total;
    const creditosFaltantes = tieneCreditos ? 0 : total - params.creditosDisponibles;

    return {
      scraping,
      analisis,
      total,
      tieneCreditos,
      creditosFaltantes,
    };
  },
};
```

---

## Hooks Personalizados

### useCredits - Hook Principal

```typescript
// src/hooks/useCredits.ts

import { useQuery, useMutation, useQueryClient } from 'react-query';
import { creditService } from '../services/creditService';
import { toast } from 'react-hot-toast'; // o tu librería de notificaciones

export const useCredits = () => {
  const queryClient = useQueryClient();

  // Query para obtener balance
  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useQuery('creditBalance', creditService.getBalance, {
    staleTime: 1000 * 60 * 5, // 5 minutos
    onError: (error: any) => {
      console.error('Error obteniendo balance de créditos:', error);
    },
  });

  // Mutation para comprar créditos
  const purchaseMutation = useMutation(
    (params: { tipoPaquete: string; pagoId?: string; metodoPago?: string }) =>
      creditService.purchasePackage(params.tipoPaquete, params.pagoId, params.metodoPago),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('creditBalance');
        toast.success('Créditos comprados exitosamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error comprando créditos');
      },
    }
  );

  // Función para verificar créditos antes de una operación
  const checkBeforeOperation = async (
    videosAScrappear: number,
    videosAAnalizar: number
  ): Promise<{ success: boolean; estimate: any }> => {
    const currentBalance = balance?.creditosDisponibles || 0;
    const estimate = creditService.estimateCredits({
      videosAScrappear,
      videosAAnalizar,
      creditosDisponibles: currentBalance,
    });

    return {
      success: estimate.tieneCreditos,
      estimate,
    };
  };

  return {
    balance,
    isLoading,
    error,
    refetchBalance: refetch,
    purchaseCredits: purchaseMutation.mutate,
    isPurchasing: purchaseMutation.isLoading,
    checkBeforeOperation,
    estimateCredits: creditService.estimateCredits,
  };
};
```

### useCreditPackages - Paquetes Disponibles

```typescript
// src/hooks/useCreditPackages.ts

import { useQuery } from 'react-query';
import { creditService } from '../services/creditService';

export const useCreditPackages = () => {
  const { data: packages, isLoading, error } = useQuery(
    'creditPackages',
    creditService.getPackages,
    {
      staleTime: 1000 * 60 * 30, // 30 minutos
    }
  );

  return {
    packages: packages || [],
    isLoading,
    error,
  };
};
```

### useCreditHistory - Historial de Transacciones

```typescript
// src/hooks/useCreditHistory.ts

import { useQuery } from 'react-query';
import { creditService } from '../services/creditService';

export const useCreditHistory = (page: number = 1, limit: number = 10) => {
  const { data, isLoading, error } = useQuery(
    ['creditHistory', page, limit],
    () => creditService.getHistory(page, limit),
    {
      keepPreviousData: true,
    }
  );

  return {
    transactions: data?.transacciones || [],
    total: data?.total || 0,
    page: data?.pagina || 1,
    totalPages: Math.ceil((data?.total || 0) / limit),
    isLoading,
    error,
  };
};
```

---

## Componentes UI

### CreditBalance - Badge de Créditos

```typescript
// src/components/Credits/CreditBalance.tsx

import React from 'react';
import { useCredits } from '../../hooks/useCredits';
import { Link } from 'react-router-dom';

export const CreditBalance: React.FC<{ showDetails?: boolean }> = ({
  showDetails = false,
}) => {
  const { balance, isLoading, refetchBalance } = useCredits();

  if (isLoading) {
    return (
      <div className="credit-balance loading">
        <div className="spinner" />
      </div>
    );
  }

  const creditos = balance?.creditosDisponibles || 0;
  const isLow = creditos < 5;
  const isEmpty = creditos === 0;

  return (
    <div className={`credit-balance ${isLow ? 'low' : ''} ${isEmpty ? 'empty' : ''}`}>
      <div className="credit-info">
        <span className="credit-icon">💳</span>
        <div className="credit-text">
          <span className="credit-label">Créditos</span>
          <span className="credit-amount">{creditos}</span>
        </div>
      </div>

      {showDetails && balance && (
        <div className="credit-details">
          <div className="detail-row">
            <span>Comprados:</span>
            <span>{balance.totalComprados}</span>
          </div>
          <div className="detail-row">
            <span>Consumidos:</span>
            <span>{balance.totalConsumidos}</span>
          </div>
        </div>
      )}

      {isLow && (
        <div className="credit-warning">
          <span>⚠️ Créditos bajos</span>
          <Link to="/buy-credits" className="btn-buy-small">
            Comprar
          </Link>
        </div>
      )}

      <button onClick={() => refetchBalance()} className="btn-refresh">
        🔄
      </button>
    </div>
  );
};
```

### CreditEstimator - Estimador de Créditos

```typescript
// src/components/Credits/CreditEstimator.tsx

import React, { useMemo } from 'react';
import { useCredits } from '../../hooks/useCredits';

interface Props {
  videosAScrappear: number;
  videosAAnalizar: number;
  onInsufficientCredits?: () => void;
}

export const CreditEstimator: React.FC<Props> = ({
  videosAScrappear,
  videosAAnalizar,
  onInsufficientCredits,
}) => {
  const { balance, estimateCredits } = useCredits();

  const estimate = useMemo(() => {
    if (!balance) return null;

    return estimateCredits({
      videosAScrappear,
      videosAAnalizar,
      creditosDisponibles: balance.creditosDisponibles,
    });
  }, [videosAScrappear, videosAAnalizar, balance, estimateCredits]);

  if (!estimate) return null;

  return (
    <div className={`credit-estimator ${!estimate.tieneCreditos ? 'insufficient' : ''}`}>
      <h4>📊 Estimación de Créditos</h4>

      <div className="estimate-breakdown">
        <div className="estimate-row">
          <span className="estimate-label">
            Scraping ({videosAScrappear} videos):
          </span>
          <span className="estimate-value">{estimate.scraping} créditos</span>
        </div>

        <div className="estimate-row">
          <span className="estimate-label">
            Análisis con IA ({videosAAnalizar} videos):
          </span>
          <span className="estimate-value">{estimate.analisis} créditos</span>
        </div>

        <div className="estimate-divider" />

        <div className="estimate-row total">
          <span className="estimate-label">Total necesario:</span>
          <span className="estimate-value">{estimate.total} créditos</span>
        </div>

        <div className="estimate-row">
          <span className="estimate-label">Tienes disponible:</span>
          <span className="estimate-value">
            {balance?.creditosDisponibles || 0} créditos
          </span>
        </div>
      </div>

      {!estimate.tieneCreditos && (
        <div className="insufficient-credits-alert">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <p className="alert-title">Créditos Insuficientes</p>
            <p className="alert-message">
              Te faltan <strong>{estimate.creditosFaltantes} créditos</strong> para
              realizar esta operación.
            </p>
            <button
              onClick={onInsufficientCredits}
              className="btn-buy-credits"
            >
              Comprar Créditos
            </button>
          </div>
        </div>
      )}

      {estimate.tieneCreditos && (
        <div className="sufficient-credits-alert">
          <span className="alert-icon">✅</span>
          <p>Tienes suficientes créditos para continuar</p>
        </div>
      )}
    </div>
  );
};
```

### CreditPackageSelector - Selector de Paquetes

```typescript
// src/components/Credits/CreditPackageSelector.tsx

import React, { useState } from 'react';
import { useCreditPackages } from '../../hooks/useCreditPackages';
import { useCredits } from '../../hooks/useCredits';
import type { CreditPackage } from '../../types/credits.types';

export const CreditPackageSelector: React.FC = () => {
  const { packages, isLoading } = useCreditPackages();
  const { purchaseCredits, isPurchasing } = useCredits();
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (pkg.precio === 0) {
      // Paquete gratuito
      purchaseCredits({ tipoPaquete: pkg.tipo });
    } else {
      // Paquete de pago - aquí integrarías Stripe/PayPal
      setSelectedPackage(pkg);
      // Abrir modal de pago
    }
  };

  if (isLoading) {
    return <div>Cargando paquetes...</div>;
  }

  return (
    <div className="package-selector">
      <h2>💎 Comprar Créditos</h2>
      <p className="subtitle">Elige el paquete que mejor se adapte a tus necesidades</p>

      <div className="packages-grid">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`package-card ${pkg.metadata?.destacado ? 'featured' : ''}`}
          >
            {pkg.metadata?.etiqueta && (
              <div className="package-badge">{pkg.metadata.etiqueta}</div>
            )}

            <h3 className="package-name">{pkg.nombre}</h3>
            <p className="package-description">{pkg.descripcion}</p>

            <div className="package-credits">
              <span className="credits-amount">{pkg.creditos}</span>
              <span className="credits-label">créditos</span>
            </div>

            <div className="package-price">
              {pkg.precio === 0 ? (
                <span className="price-free">Gratis</span>
              ) : (
                <>
                  <span className="price-currency">$</span>
                  <span className="price-amount">{pkg.precio}</span>
                </>
              )}
            </div>

            <div className="package-value">
              <span className="value-label">Valor:</span>
              <span className="value-amount">
                {pkg.creditos * 50} videos scrapeados o {pkg.creditos * 4} videos
                analizados
              </span>
            </div>

            {pkg.metadata?.caracteristicas && (
              <ul className="package-features">
                {pkg.metadata.caracteristicas.map((feature, idx) => (
                  <li key={idx}>
                    <span className="feature-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => handlePurchase(pkg)}
              disabled={isPurchasing || !pkg.activo}
              className={`btn-purchase ${pkg.metadata?.destacado ? 'primary' : 'secondary'}`}
            >
              {isPurchasing ? 'Procesando...' : pkg.precio === 0 ? 'Obtener Gratis' : 'Comprar'}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-info">
        <h4>💡 ¿Cómo funcionan los créditos?</h4>
        <ul>
          <li>
            <strong>1 crédito</strong> = 50 videos scrapeados + 4 videos analizados con
            IA
          </li>
          <li>Los créditos no expiran</li>
          <li>Puedes usarlos cuando quieras</li>
          <li>Aplican a todos los tipos de análisis</li>
        </ul>
      </div>
    </div>
  );
};
```

### CreditTransactionHistory - Historial

```typescript
// src/components/Credits/CreditTransactionHistory.tsx

import React from 'react';
import { useCreditHistory } from '../../hooks/useCreditHistory';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const CreditTransactionHistory: React.FC = () => {
  const { transactions, total, page, totalPages, isLoading } = useCreditHistory(1, 20);

  if (isLoading) {
    return <div>Cargando historial...</div>;
  }

  const getTransactionIcon = (tipo: string) => {
    switch (tipo) {
      case 'COMPRA':
        return '💰';
      case 'CONSUMO':
        return '📉';
      case 'REGALO':
        return '🎁';
      case 'REEMBOLSO':
        return '↩️';
      default:
        return '📝';
    }
  };

  const getTransactionColor = (tipo: string) => {
    switch (tipo) {
      case 'COMPRA':
      case 'REGALO':
      case 'REEMBOLSO':
        return 'positive';
      case 'CONSUMO':
        return 'negative';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="transaction-history">
      <h2>📜 Historial de Transacciones</h2>

      <div className="history-stats">
        <div className="stat">
          <span className="stat-label">Total de transacciones</span>
          <span className="stat-value">{total}</span>
        </div>
      </div>

      <div className="transactions-list">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="transaction-item">
            <div className="transaction-icon">
              {getTransactionIcon(transaction.tipo)}
            </div>

            <div className="transaction-content">
              <div className="transaction-header">
                <h4 className="transaction-title">{transaction.descripcion}</h4>
                <span className={`transaction-amount ${getTransactionColor(transaction.tipo)}`}>
                  {transaction.cantidad > 0 ? '+' : ''}
                  {transaction.cantidad} créditos
                </span>
              </div>

              <div className="transaction-footer">
                <span className="transaction-date">
                  {formatDistanceToNow(new Date(transaction.creadoEn), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>

                <span className="transaction-balance">
                  Balance: {transaction.balanceAnterior} → {transaction.balanceResultante}
                </span>

                <span className={`transaction-status status-${transaction.estado.toLowerCase()}`}>
                  {transaction.estado}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {transactions.length === 0 && (
        <div className="empty-state">
          <p>No tienes transacciones aún</p>
          <p className="empty-subtitle">
            Tus compras y consumos de créditos aparecerán aquí
          </p>
        </div>
      )}
    </div>
  );
};
```

---

## Manejo de Errores

### Interceptor de Axios para Errores 402

```typescript
// src/config/axios.ts

import axios from 'axios';
import type { InsufficientCreditsError } from '../types/credits.types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Interceptor para manejar errores de créditos
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 402) {
      const errorData: InsufficientCreditsError = error.response.data;

      // Emitir evento personalizado para que la UI lo maneje
      window.dispatchEvent(
        new CustomEvent('insufficient-credits', {
          detail: errorData,
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Hook para Escuchar Errores de Créditos

```typescript
// src/hooks/useInsufficientCreditsHandler.ts

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { InsufficientCreditsError } from '../types/credits.types';

export const useInsufficientCreditsHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleInsufficientCredits = (event: CustomEvent<InsufficientCreditsError>) => {
      const { detail } = event;

      // Mostrar toast con información detallada
      toast.error(
        (t) => (
          <div className="insufficient-credits-toast">
            <h4>⚠️ Créditos Insuficientes</h4>
            <p>{detail.message}</p>
            {detail.desglose && (
              <div className="toast-breakdown">
                <p>
                  Necesitas: {detail.desglose.scraping} créditos (scraping) +{' '}
                  {detail.desglose.analisis} créditos (análisis) ={' '}
                  {detail.creditosNecesarios} total
                </p>
                <p>Tienes: {detail.creditosDisponibles} créditos</p>
              </div>
            )}
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/buy-credits');
              }}
              className="toast-btn-buy"
            >
              Comprar Créditos
            </button>
          </div>
        ),
        {
          duration: 8000,
          style: {
            minWidth: '350px',
          },
        }
      );
    };

    window.addEventListener('insufficient-credits', handleInsufficientCredits as any);

    return () => {
      window.removeEventListener('insufficient-credits', handleInsufficientCredits as any);
    };
  }, [navigate]);
};
```

---

## Ejemplos de Integración

### Ejemplo 1: Formulario de Análisis con Estimador

```typescript
// src/pages/CategoryAnalysisPage.tsx

import React, { useState } from 'react';
import { CreditEstimator } from '../components/Credits/CreditEstimator';
import { useCredits } from '../hooks/useCredits';
import { useCategoryAnalysis } from '../hooks/useCategoryAnalysis';
import { useNavigate } from 'react-router-dom';

export const CategoryAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkBeforeOperation } = useCredits();
  const { analyzeCategory, isAnalyzing } = useCategoryAnalysis();

  const [formData, setFormData] = useState({
    numberOfVideos: 200,
    analyzeTop: 30,
    hashtags: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar créditos ANTES de enviar
    const { success, estimate } = await checkBeforeOperation(
      formData.numberOfVideos,
      formData.analyzeTop
    );

    if (!success) {
      // El estimador ya muestra el error, solo navegamos
      return;
    }

    // Proceder con el análisis
    analyzeCategory({
      hashtags: formData.hashtags,
      numberOfVideos: formData.numberOfVideos,
      analyzeTop: formData.analyzeTop,
    });
  };

  return (
    <div className="analysis-page">
      <h1>Análisis por Categoría</h1>

      <form onSubmit={handleSubmit}>
        {/* Campos del formulario */}
        <div className="form-group">
          <label>Videos a scrapear</label>
          <input
            type="number"
            value={formData.numberOfVideos}
            onChange={(e) =>
              setFormData({ ...formData, numberOfVideos: parseInt(e.target.value) })
            }
            min={50}
            max={500}
          />
        </div>

        <div className="form-group">
          <label>Videos a analizar con IA</label>
          <input
            type="number"
            value={formData.analyzeTop}
            onChange={(e) =>
              setFormData({ ...formData, analyzeTop: parseInt(e.target.value) })
            }
            min={10}
            max={100}
          />
        </div>

        {/* Estimador de créditos */}
        <CreditEstimator
          videosAScrappear={formData.numberOfVideos}
          videosAAnalizar={formData.analyzeTop}
          onInsufficientCredits={() => navigate('/buy-credits')}
        />

        <button type="submit" disabled={isAnalyzing}>
          {isAnalyzing ? 'Analizando...' : 'Iniciar Análisis'}
        </button>
      </form>
    </div>
  );
};
```

### Ejemplo 2: Layout con Balance de Créditos

```typescript
// src/layouts/DashboardLayout.tsx

import React from 'react';
import { CreditBalance } from '../components/Credits/CreditBalance';
import { useInsufficientCreditsHandler } from '../hooks/useInsufficientCreditsHandler';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hook para escuchar errores de créditos globalmente
  useInsufficientCreditsHandler();

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>TikMark</h1>
        </div>

        <div className="header-right">
          <CreditBalance showDetails={false} />
          {/* Otros elementos del header */}
        </div>
      </header>

      <main className="dashboard-main">{children}</main>
    </div>
  );
};
```

---

## Estilos CSS Sugeridos

```css
/* src/styles/credits.css */

/* Credit Balance Badge */
.credit-balance {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.credit-balance.low {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  animation: pulse 2s infinite;
}

.credit-balance.empty {
  background: #e74c3c;
}

.credit-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.credit-icon {
  font-size: 1.5rem;
}

.credit-amount {
  font-size: 1.5rem;
  font-weight: bold;
}

/* Credit Estimator */
.credit-estimator {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
}

.credit-estimator.insufficient {
  border: 2px solid #e74c3c;
}

.estimate-breakdown {
  margin: 1rem 0;
}

.estimate-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.estimate-row.total {
  font-weight: bold;
  font-size: 1.1rem;
  border-top: 2px solid #dee2e6;
  margin-top: 0.5rem;
  padding-top: 1rem;
}

.insufficient-credits-alert {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.sufficient-credits-alert {
  background: #d4edda;
  border: 1px solid #28a745;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Package Selector */
.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.package-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.package-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

.package-card.featured {
  border: 2px solid #667eea;
  transform: scale(1.05);
}

.package-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.package-credits {
  text-align: center;
  margin: 1.5rem 0;
}

.credits-amount {
  font-size: 3rem;
  font-weight: bold;
  color: #667eea;
  display: block;
}

.package-price {
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  margin: 1rem 0;
}

.price-free {
  color: #28a745;
}

/* Animations */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
```

---

## Flujo Completo de Usuario

```
1. Usuario entra a análisis de categoría
   ↓
2. Llena formulario (200 videos, 30 analizados)
   ↓
3. El CreditEstimator calcula:
   - Scraping: 4 créditos
   - Análisis: 8 créditos
   - Total: 12 créditos
   ↓
4. Si tiene créditos → Muestra ✅ "Puedes continuar"
   Si NO tiene → Muestra ⚠️ "Faltan X créditos" + botón "Comprar"
   ↓
5. Usuario hace submit
   ↓
6. Backend valida créditos
   ↓
7a. Si OK → Ejecuta análisis y descuenta créditos
7b. Si NO → Retorna 402 + detalles
   ↓
8. Frontend intercepta 402 → Muestra toast con opción de comprar
   ↓
9. Usuario va a /buy-credits
   ↓
10. Selecciona paquete y compra
   ↓
11. Balance se actualiza automáticamente (React Query)
   ↓
12. Usuario puede reintentar el análisis
```

---

## Checklist de Implementación

- [ ] Instalar dependencias (axios, react-query, date-fns)
- [ ] Crear tipos TypeScript
- [ ] Implementar servicio de créditos
- [ ] Crear hooks (useCredits, useCreditPackages, useCreditHistory)
- [ ] Implementar CreditBalance component
- [ ] Implementar CreditEstimator component
- [ ] Implementar CreditPackageSelector component
- [ ] Implementar CreditTransactionHistory component
- [ ] Configurar interceptor de axios para errores 402
- [ ] Implementar useInsufficientCreditsHandler
- [ ] Integrar estimador en formularios de análisis
- [ ] Agregar balance en header/navbar
- [ ] Crear página de compra de créditos
- [ ] Agregar estilos CSS
- [ ] Testear flujo completo

---

## Notas Finales

- El estimador de créditos debe mostrarse SIEMPRE en formularios de análisis
- Actualizar balance después de cada operación con `refetchBalance()`
- Usar React Query para mantener el estado sincronizado
- Considerar agregar notificaciones cuando créditos < 10%
- Implementar sistema de recordatorios para usuarios sin créditos

---

**Última actualización:** 2025-12-17
**Versión:** 1.0.0
