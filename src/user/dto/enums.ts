// ========== ENUMS ==========
export enum TipoSuscripcion {
  GRATUITA = 'gratuita',
  BASICA = 'basica',
  PREMIUM = 'premium',
  EMPRESARIAL = 'empresarial',
}

export enum EstadoUsuario {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  SUSPENDIDO = 'suspendido',
}

export enum RolUsuario {
  USUARIO = 'usuario',
  ADMIN = 'admin',
}

// ========== ENUMS DE CRÉDITOS ==========
export enum TipoPaqueteCredito {
  GRATIS = 'gratis',
  BASICO = 'basico',
  ESTANDAR = 'estandar',
  PREMIUM = 'premium',
}

export enum TipoTransaccionCredito {
  COMPRA = 'compra',
  CONSUMO = 'consumo',
  REGALO = 'regalo',
  REEMBOLSO = 'reembolso',
  EXPIRACION = 'expiracion',
}

export enum EstadoTransaccion {
  PENDIENTE = 'pendiente',
  COMPLETADA = 'completada',
  FALLIDA = 'fallida',
  CANCELADA = 'cancelada',
}

export enum SectorEconomico {
  TECNOLOGIA = 'tecnologia',
  MODA = 'moda',
  BELLEZA = 'belleza',
  COMIDA = 'comida',
  ENTRETENIMIENTO = 'entretenimiento',
  DEPORTES = 'deportes',
  EDUCACION = 'educacion',
  SALUD = 'salud',
  VIAJES = 'viajes',
  FINANZAS = 'finanzas',
  MARKETING = 'marketing',
  ECOMMERCE = 'ecommerce',
  GAMING = 'gaming',
  MUSICA = 'musica',
  ARTE = 'arte',
  INMOBILIARIO = 'inmobiliario',
  OTRO = 'otro',
}

export enum TipoProducto {
  FISICO = 'fisico',
  DIGITAL = 'digital',
  SERVICIO = 'servicio',
  APLICACION = 'aplicacion',
  CONTENIDO = 'contenido',
  EDUCATIVO = 'educativo',
}
