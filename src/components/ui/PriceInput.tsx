import React, { useState, useEffect } from 'react';
import Input from './Input';
import { validateMercadoPagoPrice, validatePurchasePrice, getPriceHelpText, MERCADOPAGO_LIMITS } from '../../utils/mercadoPagoValidation';

interface PriceInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  type?: 'sale' | 'purchase';
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const PriceInput: React.FC<PriceInputProps> = ({
  label,
  value,
  onChange,
  type = 'sale',
  required = false,
  placeholder,
  className = '',
  disabled = false
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    // Validar el precio cuando cambie
    if (value > 0) {
      const validation = type === 'purchase' 
        ? validatePurchasePrice(value)
        : validateMercadoPagoPrice(value, 'precio');
      
      setIsValid(validation.isValid);
      setError(validation.error || null);
    } else {
      setIsValid(true);
      setError(null);
    }
  }, [value, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const newValue = parseFloat(inputValue) || 0;
    
    // Bloquear valores mayores al límite máximo
    if (newValue > MERCADOPAGO_LIMITS.MAX_PRICE) {
      // Mostrar alerta y mantener el valor anterior
      alert(`⚠️ Límite excedido\n\nEl precio máximo permitido es $${MERCADOPAGO_LIMITS.MAX_PRICE.toLocaleString()}\n\nEsto garantiza la compatibilidad con MercadoPago y otros sistemas de pago.`);
      return; // No actualizar el valor
    }
    
    onChange(newValue);
  };

  const inputClassName = `${className} ${!isValid ? 'border-red-500' : ''}`;

  return (
    <div>
      <Input
        label={label}
        type="number"
        step="0.01"
        min={type === 'sale' ? MERCADOPAGO_LIMITS.MIN_PRICE : 0.01}
        max={MERCADOPAGO_LIMITS.MAX_PRICE}
        value={value}
        onChange={handleChange}
        required={required}
        placeholder={placeholder || (type === 'sale' ? 'Ej: 2500.00' : 'Ej: 150.50')}
        className={inputClassName}
        disabled={disabled}
      />
      
      {/* Mensaje de error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200 mt-1">
          {error}
        </div>
      )}
      
      {/* Texto de ayuda */}
      {!error && (
        <div className="text-xs text-gray-500 mt-1">
          {getPriceHelpText(type)}
        </div>
      )}
    </div>
  );
};

export default PriceInput;