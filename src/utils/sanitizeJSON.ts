/**
 * Utilidades para manejar objetos JSON con referencias circulares
 */

/**
 * Sanitiza un objeto JSON eliminando referencias circulares y conservando solo las propiedades necesarias
 * @param obj El objeto a sanitizar
 * @param seen Set de objetos ya procesados (para detección de ciclos)
 * @param depth Profundidad actual de recursión
 * @returns El objeto sanitizado sin referencias circulares
 */
export function sanitizeCircularReferences(obj: any, seen = new WeakSet(), depth = 0): any {
  // Limitar la profundidad para evitar desbordamiento de pila
  if (depth > 20) return { _depthLimitReached: true };
  
  // Caso base para null o tipos primitivos
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Si ya hemos visto este objeto, significa que hay una referencia circular
  if (seen.has(obj)) {
    // Si tiene ID, lo preservamos para mantener la referencia
    return obj.id ? { id: obj.id, _circular: true } : { _circular: true };
  }
  
  // Marcar este objeto como visto
  seen.add(obj);
  
  // Si es un array, procesamos cada elemento
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeCircularReferences(item, seen, depth + 1));
  }
  
  // Si es un objeto, procesamos cada propiedad
  const result: any = {};
  
  // Lista de propiedades que queremos preservar
  const keysToKeep = [
    'id', 'fechaPedido', 'estado', 'total', 'tiempoEstimadoMinutos', 'horaEstimadaFinalizacion',
    'numeroPedido', 'totalCosto', 'formaPago', 'tipoEnvio', 'empleado', 'sucursal', 'domicilio',
    'detalles', 'cantidad', 'subTotal', 'articulo', 'denominacion', 'descripcion', 'imagenesArticulos',
    'categoria', 'unidadMedida', 'url', 'nombre', 'provincia', 'pais', 'calle', 'numero', 'piso', 'nroDpto',
    'cp', 'localidad', 'cliente', 'apellido', 'email', 'telefono', 'usuario', 'facturaEmitida'
  ];
  
  // Primero preservamos el ID si existe (siempre importante)
  if (obj.id !== undefined) {
    result.id = obj.id;
  }
  
  // Luego procesamos el resto de propiedades importantes
  for (const key in obj) {
    // Incluir todas las propiedades que necesitamos para mostrar pedidos
    if (keysToKeep.includes(key)) {
      result[key] = sanitizeCircularReferences(obj[key], seen, depth + 1);
    }
  }
  
  return result;
}

/**
 * Detecta arrays dentro de un objeto de respuesta de API
 * @param data Los datos de respuesta a analizar
 * @returns El array encontrado con más elementos, o un array vacío si no se encontró ninguno
 */
export function extractArrayFromResponse(data: any): any[] {
  console.log('Extrayendo array de respuesta. Tipo de datos:', typeof data);
  
  // Si ya es un array, devolverlo directamente
  if (Array.isArray(data)) {
    console.log('✅ Datos ya son un array con', data.length, 'elementos');
    return data;
  }
  
  // Si es un string, intentar parsearlo como JSON o repararlo si está malformado
  if (typeof data === 'string') {
    console.log('📄 Los datos son un string, intentando procesar');
    
    // Reparación de JSON para casos comunes de malformación
    const fixedData = fixMalformedJson(data);
    
    try {
      // Verificar si el string comienza con corchete (probable array JSON)
      if (fixedData.trim().startsWith('[')) {
        console.log('📄 El string parece ser un array JSON');
        const parsed = JSON.parse(fixedData);
        if (Array.isArray(parsed)) {
          console.log('✅ String parseado como array con', parsed.length, 'elementos');
          return parsed;
        }
      }
      
      // Si no comienza con corchete, aún así intentar parsear
      const parsed = JSON.parse(fixedData);
      console.log('📄 String parseado como JSON, verificando contenido');
      return extractArrayFromResponse(parsed);
    } catch (e) {
      console.error('❌ Error al parsear respuesta como JSON después de intentar reparación:', e);
      
      // Si el parsing falla, intentar extraer estructuras de array usando regex
      return extractArraysWithRegex(data);
    }
  }
  
  // Si es un objeto, buscar arrays dentro de él
  if (data && typeof data === 'object') {
    console.log('🔍 Datos son un objeto, buscando arrays');
    
    // Buscar propiedades que contengan arrays
    const possibleArrays = Object.entries(data)
      .filter(([_, value]) => Array.isArray(value) && value.length > 0)
      .map(([key, value]) => ({ key, value: value as any[], length: (value as any[]).length }));
    
    if (possibleArrays.length > 0) {
      // Usar el array más grande encontrado
      const largestArray = possibleArrays.reduce(
        (prev, curr) => (curr.length > prev.length ? curr : prev),
        possibleArrays[0]
      );
      
      console.log(`📦 Encontrado array en propiedad "${largestArray.key}" con ${largestArray.length} elementos`);
      return largestArray.value;
    }
    
    // Verificar si el objeto mismo es una colección con propiedades numéricas
    const numericKeys = Object.keys(data).filter(key => !isNaN(Number(key)));
    if (numericKeys.length > 0 && numericKeys.length === Object.keys(data).length) {
      console.log('📊 Objeto con claves numéricas detectado, convirtiendo a array');
      const arrayValues = Object.values(data);
      return arrayValues;
    }
    
    // Verificar si el objeto parece ser un único elemento
    if (data.id !== undefined) {
      console.log('🔍 Datos parecen ser un único elemento, encapsulando en array');
      return [data];
    }
    
    // Verificar si hay una propiedad que pueda contener la lista
    const likelyContainers = ['data', 'content', 'items', 'results', 'pedidos', 'list', 'elements'];
    for (const container of likelyContainers) {
      if (data[container] !== undefined) {
        console.log(`🔍 Encontrada posible propiedad contenedora: ${container}`);
        const containerContent = data[container];
        if (Array.isArray(containerContent)) {
          console.log(`✅ La propiedad ${container} contiene un array con ${containerContent.length} elementos`);
          return containerContent;
        } else if (containerContent && typeof containerContent === 'object') {
          console.log(`🔄 La propiedad ${container} es un objeto, intentando extraer array`);
          const nestedResult = extractArrayFromResponse(containerContent);
          if (nestedResult.length > 0) {
            return nestedResult;
          }
        }
      }
    }
    
    // Último intento: serializar y ver si hay algún array en la estructura JSON
    try {
      console.log('🔄 Último intento: serialización y análisis de estructura JSON');
      const jsonStr = JSON.stringify(data);
      
      // Buscar patrones de array en la cadena JSON
      if (jsonStr.includes('[{') && jsonStr.includes('}]')) {
        console.log('📝 Patrón de array detectado en la cadena JSON');
        
        // Intentar extraer el array mediante expresiones regulares
        const arrayPattern = /\[\s*{[^]*?}\s*\]/g;
        const matches = jsonStr.match(arrayPattern);
        
        if (matches && matches.length > 0) {
          // Usar el array más largo encontrado
          const largestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
          try {
            const parsedArray = JSON.parse(largestMatch);
            if (Array.isArray(parsedArray) && parsedArray.length > 0) {
              console.log(`✅ Extraído array de ${parsedArray.length} elementos mediante análisis de estructura JSON`);
              return parsedArray;
            }
          } catch (e) {
            console.error('❌ Error al parsear coincidencia de array:', e);
          }
        }
      }
    } catch (e) {
      console.error('❌ Error al serializar objeto para buscar arrays:', e);
    }
  }
  
  console.warn('⚠️ No se pudo encontrar un array en los datos');
  // Si no se encontró ningún array, devolver array vacío
  return [];
}

/**
 * Intenta reparar JSON malformado en casos comunes
 * @param jsonString El string JSON potencialmente malformado
 * @returns El string JSON reparado o el original si no se pudo reparar
 */
function fixMalformedJson(jsonString: string): string {
  // Caso 1: String sin terminar (sin comillas de cierre)
  let fixed = jsonString;
  
  // Detectar y corregir strings no terminados
  // Buscar patrón: "key": "value (sin comilla de cierre)
  const untermStringRegex = /("[\w\d_]+"\s*:\s*"[^"]*)(,|\}|\])/g;
  fixed = fixed.replace(untermStringRegex, '$1"$2');
  
  // Caso 2: Propiedades sin valor (falta ":")
  // Buscar patrón: "key" "value" (falta dos puntos)
  const missingColonRegex = /("[\w\d_]+")\s+("[\w\d_]+")/g;
  fixed = fixed.replace(missingColonRegex, '$1: $2');
  
  // Caso 3: Valores literales sin comillas (cuando deberían ser strings)
  // Buscar patrón: "key": value (donde value no es numérico ni true/false/null)
  const unquotedValueRegex = /("[\w\d_]+"\s*:\s*)(?!\s*["{\[0-9tfn])([\w\d_]+)(\s*[,}\]])/g;
  fixed = fixed.replace(unquotedValueRegex, '$1"$2"$3');
  
  // Caso 4: Corchetes o llaves sin cerrar al final del documento
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  
  // Cerrar corchetes y llaves faltantes
  if (openBrackets > closeBrackets) {
    fixed += ']'.repeat(openBrackets - closeBrackets);
  }
  if (openBraces > closeBraces) {
    fixed += '}'.repeat(openBraces - closeBraces);
  }
  
  // Caso 5: Truncamiento de JSON (detectado en los logs)
  // Si termina abruptamente, intentamos cerrar la estructura
  if (fixed.endsWith('"') || fixed.endsWith(',') || fixed.endsWith(':')) {
    if (openBraces > closeBraces) {
      // Probablemente es un objeto que fue truncado
      fixed += '""' + '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      // Probablemente es un array que fue truncado
      fixed += 'null' + ']'.repeat(openBrackets - closeBrackets);
    }
  }
  
  return fixed;
}

/**
 * Extrae arrays de un string usando expresiones regulares cuando el parsing JSON falla
 * @param data String que puede contener estructuras de array
 * @returns Array con los objetos extraídos o array vacío si no se encontró nada
 */
function extractArraysWithRegex(data: string): any[] {
  console.log('🔍 Intentando extraer arrays con regex');
  
  try {
    // Buscar patrones de objetos dentro de un array: [{...},{...}]
    const arrayPattern = /\[\s*\{\s*"id"\s*:\s*\d+.*?\}\s*(?:,\s*\{\s*"id"\s*:\s*\d+.*?\}\s*)*\]/g;
    const matches = data.match(arrayPattern);
    
    if (matches && matches.length > 0) {
      // Tomar la coincidencia más larga (probable array principal)
      const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
      console.log(`🔍 Encontrado posible array mediante regex (${longestMatch.length} caracteres)`);
      
      // Intentar extraer objetos individuales
      const objectPattern = /\{\s*"id"\s*:\s*(\d+).*?\}/g;
      const objectMatches = longestMatch.match(objectPattern);
      
      if (objectMatches && objectMatches.length > 0) {
        console.log(`🔍 Extrayendo ${objectMatches.length} objetos individuales`);
        
        // Convertir cada objeto a un objeto válido con un ID al menos
        const extractedObjects = objectMatches.map(objStr => {
          try {
            // Intentar reparar y parsear el objeto individual
            const fixedObj = fixMalformedJson(objStr);
            return JSON.parse(fixedObj);
          } catch (e) {
            // Si falla, extraer al menos el ID
            const idMatch = objStr.match(/"id"\s*:\s*(\d+)/);
            if (idMatch && idMatch[1]) {
              return { id: parseInt(idMatch[1]), _extracted: true };
            }
            return null;
          }
        }).filter(Boolean); // Eliminar nulos
        
        if (extractedObjects.length > 0) {
          console.log(`✅ Extraídos ${extractedObjects.length} objetos válidos mediante regex`);
          return extractedObjects;
        }
      }
      
      // Intento directo con el objeto reparado
      try {
        const repaired = fixMalformedJson(longestMatch);
        const parsed = JSON.parse(repaired);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`✅ Array reparado y parseado con ${parsed.length} elementos`);
          return parsed;
        }
      } catch (e) {
        console.error('Error al parsear array reparado:', e);
      }
    }
    
    // Extraer IDs de pedido como último recurso
    console.log('🔍 Buscando IDs de pedidos como último recurso');
    const idMatches = data.match(/"id"\s*:\s*(\d+)/g);
    if (idMatches && idMatches.length > 0) {
      const ids = idMatches.map(match => {
        const idValue = match.match(/\d+/);
        return idValue ? parseInt(idValue[0]) : null;
      }).filter(Boolean);
      
      if (ids.length > 0) {
        console.log(`✅ Extraídos ${ids.length} IDs de pedidos`);
        // Construir objetos simples con los IDs
        return ids.map(id => ({ id, _extracted: true }));
      }
    }
  } catch (e) {
    console.error('Error durante extracción con regex:', e);
  }
  
  console.warn('⚠️ No se pudo extraer ningún array válido mediante regex');
  return [];
}

/**
 * Valida un objeto de pedido
 * @param pedido El objeto pedido a validar
 * @returns true si el pedido es válido, false en caso contrario
 */
export function isValidPedido(pedido: any): boolean {
  return (
    pedido &&
    typeof pedido === 'object' &&
    pedido.id !== undefined
  );
}

/**
 * Normaliza un pedido asegurando que tenga todas las propiedades necesarias
 * @param pedido El pedido a normalizar
 * @returns El pedido normalizado con valores por defecto para propiedades faltantes
 */
export function normalizePedido(pedido: any): any {
  if (!pedido || typeof pedido !== 'object') return pedido;
  
  // Sanitizar para eliminar referencias circulares
  const sanitized = sanitizeCircularReferences(pedido);
  
  // Asegurar valores por defecto para propiedades críticas
  return {
    ...sanitized,
    estado: sanitized.estado || 'PENDIENTE',
    total: sanitized.total !== undefined ? sanitized.total : 0,
    tiempoEstimadoMinutos: sanitized.tiempoEstimadoMinutos || 30,
    fechaPedido: sanitized.fechaPedido || new Date().toISOString()
  };
}
