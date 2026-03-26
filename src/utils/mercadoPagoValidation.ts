/**
 * Utilidades de validación para precios compatibles con MercadoPago
 * 
 * Límites de MercadoPago por país:
 * - Argentina: $999.999 ARS máximo por transacción
 * - Brasil: R$50.000 BRL máximo 
 * - México: $200.000 MXN máximo
 * - General: Entre $1 y $1.000.000 para la mayoría de países
 * 
 * Para máxima compatibilidad, usamos $999.999 como límite superior
 */

export interface PriceValidationResult {
  isValid: boolean;
  error?: string;
}

export const MERCADOPAGO_LIMITS = {
  MIN_PRICE: 1,
  MAX_PRICE: 999999,
  MAX_DECIMALS: 2,
} as const;

/**
 * Valida si un precio es compatible con MercadoPago
 */
export function validateMercadoPagoPrice(price: number, fieldName: string = 'precio'): PriceValidationResult {
  // Validar que sea un número válido
  if (isNaN(price) || !isFinite(price)) {
    return {
      isValid: false,
      error: `El ${fieldName} debe ser un número válido`
    };
  }

  // Validar precio mínimo
  if (price < MERCADOPAGO_LIMITS.MIN_PRICE) {
    return {
      isValid: false,
      error: `El ${fieldName} mínimo es $${MERCADOPAGO_LIMITS.MIN_PRICE} (requerimiento de MercadoPago)`
    };
  }

  // Validar precio máximo
  if (price > MERCADOPAGO_LIMITS.MAX_PRICE) {
    return {
      isValid: false,
      error: `El ${fieldName} máximo es $${MERCADOPAGO_LIMITS.MAX_PRICE.toLocaleString()} (límite de MercadoPago)`
    };
  }

  // Validar decimales (máximo 2)
  const decimalCount = (price.toString().split('.')[1] || '').length;
  if (decimalCount > MERCADOPAGO_LIMITS.MAX_DECIMALS) {
    return {
      isValid: false,
      error: `El ${fieldName} solo puede tener hasta ${MERCADOPAGO_LIMITS.MAX_DECIMALS} decimales`
    };
  }

  // Validación alternativa para decimales usando multiplicación
  if ((price * 100) % 1 !== 0) {
    return {
      isValid: false,
      error: `El ${fieldName} solo puede tener hasta ${MERCADOPAGO_LIMITS.MAX_DECIMALS} decimales (centavos)`
    };
  }

  return { isValid: true };
}

/**
 * Valida un precio de compra (puede ser desde $0.01)
 */
export function validatePurchasePrice(price: number): PriceValidationResult {
  // Para precios de compra, permitimos desde $0.01
  if (isNaN(price) || !isFinite(price)) {
    return {
      isValid: false,
      error: 'El precio de compra debe ser un número válido'
    };
  }

  if (price <= 0) {
    return {
      isValid: false,
      error: 'El precio de compra debe ser mayor a cero'
    };
  }

  if (price > MERCADOPAGO_LIMITS.MAX_PRICE) {
    return {
      isValid: false,
      error: `El precio de compra máximo es $${MERCADOPAGO_LIMITS.MAX_PRICE.toLocaleString()} (límite de sistemas de pago)`
    };
  }

  // Validar decimales
  if ((price * 100) % 1 !== 0) {
    return {
      isValid: false,
      error: 'El precio de compra solo puede tener hasta 2 decimales'
    };
  }

  return { isValid: true };
}

/**
 * Valida un precio de venta (mínimo $1 para MercadoPago)
 */
export function validateSalePrice(price: number): PriceValidationResult {
  return validateMercadoPagoPrice(price, 'precio de venta');
}

/**
 * Valida que el precio de venta sea mayor o igual al precio de compra
 */
export function validateProfitMargin(salePrice: number, purchasePrice: number): PriceValidationResult {
  if (salePrice < purchasePrice) {
    return {
      isValid: false,
      error: 'El precio de venta no puede ser menor al precio de compra'
    };
  }

  return { isValid: true };
}

/**
 * Formatea un precio para mostrar en la UI con el símbolo de moneda
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}

/**
 * Obtiene el texto de ayuda para mostrar en los campos de precio
 */
export function getPriceHelpText(type: 'sale' | 'purchase' = 'sale'): string {
  if (type === 'purchase') {
    return `💡 Máximo: ${formatPrice(MERCADOPAGO_LIMITS.MAX_PRICE)} (compatible con sistemas de pago)`;
  }
  
  return `💡 Límites MercadoPago: Mínimo ${formatPrice(MERCADOPAGO_LIMITS.MIN_PRICE)} - Máximo ${formatPrice(MERCADOPAGO_LIMITS.MAX_PRICE)}`;
}

/**
 * Hook para validaciones de precio en tiempo real
 */
export function usePriceValidation() {
  return {
    validateMercadoPagoPrice,
    validatePurchasePrice,
    validateSalePrice,
    validateProfitMargin,
    formatPrice,
    getPriceHelpText,
    LIMITS: MERCADOPAGO_LIMITS
  };
}