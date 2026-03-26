import { useEffect, useRef } from 'react';

export const UpdateDetector = ({ componentName = 'Unknown' }: { componentName?: string }) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`[UpdateDetector] Component "${componentName}" rendered ${renderCount.current} times`);
    
    if (renderCount.current > 20) {
      console.error(
        `[UpdateDetector] Posible bucle infinito detectado en "${componentName}"! ` +
        `Este componente se ha renderizado ${renderCount.current} veces seguidas.`
      );
    }
    
    return () => {
      console.log(`[UpdateDetector] Component "${componentName}" unmounted after ${renderCount.current} renders`);
    };
  });
  
  return null; // Este componente no renderiza nada visualmente
};

export default UpdateDetector;
