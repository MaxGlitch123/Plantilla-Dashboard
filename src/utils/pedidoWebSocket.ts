// src/utils/pedidoWebSocket.ts

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { PedidoResponse } from '../types/order';

// Interfaz para las actualizaciones de stock
export interface StockUpdate {
  id: number;
  denominacion: string;
  stockActual: number;
  stockPendiente?: number;
  stockMinimo?: number;
  stockMaximo?: number;
}

// Estados de la conexión WebSocket
export type WebSocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Clase singleton para el WebSocket
class WebSocketService {
  private static instance: WebSocketService;
  private stompClient: Client | null = null;
  private currentState: WebSocketConnectionState = 'disconnected';
  private connectionStateHandlers: Set<(state: WebSocketConnectionState) => void> = new Set();
  private pedidoSubscribers: Set<(pedido: PedidoResponse) => void> = new Set();
  private stockSubscribers: Set<(stock: StockUpdate) => void> = new Set();
  private pedidoSubscription: StompSubscription | null = null;
  private stockSubscription: StompSubscription | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Aumentado para dar más oportunidades de conexión
  private reconnectTimer: number | null = null;
  private subscriptionActive = false;
  private wsUrl: string = '';
  
  private constructor() {
    // Intentar diferentes URLs para el WebSocket
    const configuredUrl = import.meta.env.VITE_WS_BACKEND_URL;
    
    // Intentar varias configuraciones posibles basadas en la URL base
    if (configuredUrl) {
      this.wsUrl = configuredUrl;
      
      // Log para depuración
      console.log('URL de WebSocket configurada:', this.wsUrl);
      
      // En producción, intentamos también la URL del proxy
      if (import.meta.env.PROD) {
        this.alternativeUrls.push('/ws');
        console.log('Añadido proxy de WebSocket como alternativa: /ws');
      }
      
      // Generar URLs alternativas para probar si la principal falla
      if (configuredUrl.includes("/ws")) {
        const urlBase = configuredUrl.split("/ws")[0];
        console.log('URL base detectada:', urlBase);
        
        // Agregar URLs alternativas
        if (!configuredUrl.includes("/api/ws")) {
          this.alternativeUrls.push(`${urlBase}/api/ws`);
        } else {
          this.alternativeUrls.push(`${urlBase}/ws`);
        }
        
        // Agregar otra alternativa común
        this.alternativeUrls.push(`${urlBase}/api/websocket`);
        
        console.log('URLs alternativas configuradas:', this.alternativeUrls);
      }
    } else {
      // En desarrollo usar localhost
      if (import.meta.env.DEV) {
        this.wsUrl = 'ws://localhost:8080/ws';
      } else {
        // En producción usar la URL relativa para el proxy de Vercel
        this.wsUrl = '/ws';
        console.log('Usando URL relativa de WebSocket para proxy:', this.wsUrl);
      }
    }
  }
  
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }
  
  private updateState(newState: WebSocketConnectionState) {
    this.currentState = newState;
    this.connectionStateHandlers.forEach(handler => handler(newState));
  }
  
  private createStompClient() {
    if (this.stompClient) return;
    
    console.log('Creando nuevo cliente STOMP con URL:', this.wsUrl);

    const sockJsUrl = this.wsUrl.replace('wss:', 'https:').replace('ws:', 'http:');
  
    
    this.stompClient = new Client({
      brokerURL: this.wsUrl,
      webSocketFactory: () => new SockJS(sockJsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      // Manejo de eventos de conexión
      onConnect: () => {
        console.log('WebSocket conectado exitosamente');
        this.reconnectAttempts = 0;
        this.updateState('connected');
        this.setupSubscriptions();
      },
      
      onStompError: (frame) => {
        console.error('Error STOMP:', frame);
        this.updateState('error');
        this.attemptReconnect();
      },
      
      onWebSocketClose: () => {
        console.warn('WebSocket desconectado, manejando cierre');
        this.updateState('disconnected');
        this.attemptReconnect();
      },
      
      onWebSocketError: (event) => {
        console.error('Error de WebSocket:', event);
        this.updateState('error');
        // No llamamos a reconnect aquí porque onWebSocketClose se llamará automáticamente después
      }
    });
  }
  
  private setupSubscriptions() {
    if (!this.stompClient || !this.stompClient.connected || this.subscriptionActive) return;
    
    this.subscriptionActive = true;
    
    // Suscribirse a actualizaciones de pedidos si hay suscriptores
    if (this.pedidoSubscribers.size > 0 && !this.pedidoSubscription) {
      try {
        this.pedidoSubscription = this.stompClient.subscribe(`/topic/pedidos`, (message: IMessage) => {
          try {
            const updatedPedido: PedidoResponse = JSON.parse(message.body);
            if (!updatedPedido || typeof updatedPedido !== 'object' || !updatedPedido.id) {
              console.warn('Pedido inválido recibido por WebSocket:', message.body);
              return;
            }
            console.log('Pedido actualizado recibido por WebSocket:', updatedPedido);
            this.pedidoSubscribers.forEach(callback => callback(updatedPedido));
          } catch (error) {
            console.error('Error al parsear mensaje de WebSocket:', error, message.body);
          }
        });
        console.log('Suscrito a /topic/pedidos');
      } catch (error) {
        console.error('Error al suscribirse a /topic/pedidos:', error);
      }
    }
    
    // Suscribirse a actualizaciones de stock si hay suscriptores
    if (this.stockSubscribers.size > 0 && !this.stockSubscription) {
      try {
        this.stockSubscription = this.stompClient.subscribe(`/topic/stock`, (message: IMessage) => {
          try {
            const updatedStock: StockUpdate = JSON.parse(message.body);
            if (!updatedStock || typeof updatedStock !== 'object' || !updatedStock.id) {
              console.warn('Stock inválido recibido por WebSocket:', message.body);
              return;
            }
            console.log('Stock actualizado recibido por WebSocket:', updatedStock);
            this.stockSubscribers.forEach(callback => callback(updatedStock));
          } catch (error) {
            console.error('Error al parsear mensaje de WebSocket de stock:', error, message.body);
          }
        });
        console.log('Suscrito a /topic/stock');
      } catch (error) {
        console.error('Error al suscribirse a /topic/stock:', error);
      }
    }
  }
  
  private cleanupSubscriptions() {
    if (this.pedidoSubscription && this.pedidoSubscribers.size === 0) {
      try {
        this.pedidoSubscription.unsubscribe();
        this.pedidoSubscription = null;
      } catch (e) {
        console.warn('Error al cancelar suscripción de pedidos:', e);
      }
    }
    
    if (this.stockSubscription && this.stockSubscribers.size === 0) {
      try {
        this.stockSubscription.unsubscribe();
        this.stockSubscription = null;
      } catch (e) {
        console.warn('Error al cancelar suscripción de stock:', e);
      }
    }
    
    // Si no hay más suscripciones activas, marcar como inactivo
    this.subscriptionActive = !!(this.pedidoSubscription || this.stockSubscription);
  }
  
  // Lista de URLs alternativas para probar en caso de fallo
  private alternativeUrls: string[] = [];
  private currentUrlIndex = 0;
  
  private attemptReconnect() {
    if (this.reconnectTimer !== null) return;
    
    // Si hemos agotado los intentos con la URL actual, probar la siguiente URL alternativa
    if (this.reconnectAttempts >= 3 && this.alternativeUrls.length > 0) {
      this.currentUrlIndex = (this.currentUrlIndex + 1) % (this.alternativeUrls.length + 1);
      
      // Si volvimos al índice 0, significa que probamos todas las alternativas
      if (this.currentUrlIndex === 0) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(`Máximo de intentos de reconexión (${this.maxReconnectAttempts}) alcanzado para todas las URLs`);
          return;
        }
      } else {
        // Usar una URL alternativa
        const originalUrl = this.wsUrl;
        this.wsUrl = this.alternativeUrls[this.currentUrlIndex - 1];
        console.log(`Cambiando URL de WebSocket de ${originalUrl} a ${this.wsUrl}`);
        
        // Reiniciar cliente para usar la nueva URL
        if (this.stompClient) {
          this.stompClient.deactivate();
          this.stompClient = null;
        }
        
        this.reconnectAttempts = 0;
      }
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts && this.currentUrlIndex === 0) {
      console.error(`Máximo de intentos de reconexión (${this.maxReconnectAttempts}) alcanzado`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = 2000 * Math.pow(1.5, Math.min(this.reconnectAttempts - 1, 6)); // Backoff exponencial con límite
    console.log(`Intentando reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay}ms...`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
  
  public connect() {
    this.updateState('connecting');
    
    if (!this.stompClient) {
      this.createStompClient();
    }
    
    if (this.stompClient && !this.stompClient.connected) {
      try {
        this.stompClient.activate();
      } catch (error) {
        console.error('Error al activar cliente WebSocket:', error);
        this.updateState('error');
        this.attemptReconnect();
      }
    } else if (this.stompClient?.connected) {
      this.updateState('connected');
      this.setupSubscriptions();
    }
  }
  
  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.stompClient) {
      if (this.pedidoSubscription) {
        try { this.pedidoSubscription.unsubscribe(); } catch (e) {}
        this.pedidoSubscription = null;
      }
      
      if (this.stockSubscription) {
        try { this.stockSubscription.unsubscribe(); } catch (e) {}
        this.stockSubscription = null;
      }
      
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    
    this.subscriptionActive = false;
    this.updateState('disconnected');
  }
  
  public subscribeToPedidos(callback: (pedido: PedidoResponse) => void, connectionHandler?: (state: WebSocketConnectionState) => void) {
    const isFirstPedidoSubscriber = this.pedidoSubscribers.size === 0;
    
    // Registrar el suscriptor
    this.pedidoSubscribers.add(callback);
    
    // Registrar manejador de estado si se proporcionó
    if (connectionHandler) {
      this.connectionStateHandlers.add(connectionHandler);
      // Notificar el estado actual inmediatamente
      connectionHandler(this.currentState);
    }
    
    // Si es el primer suscriptor, conectar o configurar suscripciones
    if (isFirstPedidoSubscriber) {
      if (!this.stompClient || !this.stompClient.connected) {
        this.connect();
      } else {
        this.setupSubscriptions();
      }
    }
    
    // Devolver función para cancelar suscripción
    return () => {
      this.pedidoSubscribers.delete(callback);
      if (connectionHandler) this.connectionStateHandlers.delete(connectionHandler);
      this.cleanupSubscriptions();
      
      // Si no quedan suscriptores, desconectar
      if (this.pedidoSubscribers.size === 0 && this.stockSubscribers.size === 0) {
        this.disconnect();
      }
    };
  }
  
  public subscribeToStock(callback: (stock: StockUpdate) => void, connectionHandler?: (state: WebSocketConnectionState) => void) {
    const isFirstStockSubscriber = this.stockSubscribers.size === 0;
    
    // Registrar el suscriptor
    this.stockSubscribers.add(callback);
    
    // Registrar manejador de estado si se proporcionó
    if (connectionHandler) {
      this.connectionStateHandlers.add(connectionHandler);
      // Notificar el estado actual inmediatamente
      connectionHandler(this.currentState);
    }
    
    // Si es el primer suscriptor, conectar o configurar suscripciones
    if (isFirstStockSubscriber) {
      if (!this.stompClient || !this.stompClient.connected) {
        this.connect();
      } else {
        this.setupSubscriptions();
      }
    }
    
    // Devolver función para cancelar suscripción
    return () => {
      this.stockSubscribers.delete(callback);
      if (connectionHandler) this.connectionStateHandlers.delete(connectionHandler);
      this.cleanupSubscriptions();
      
      // Si no quedan suscriptores, desconectar
      if (this.pedidoSubscribers.size === 0 && this.stockSubscribers.size === 0) {
        this.disconnect();
      }
    };
  }
  
  public getCurrentState(): WebSocketConnectionState {
    return this.currentState;
  }
}

// API pública simplificada para mantener compatibilidad

export const connectToPedidoSocket = (
  onPedidoUpdate: (pedido: PedidoResponse) => void,
  onStockUpdate?: (stock: StockUpdate) => void,
  connectionStateHandler?: (state: WebSocketConnectionState) => void
) => {
  const webSocketService = WebSocketService.getInstance();
  
  // Obtener funciones de limpieza
  const pedidoCleanup = webSocketService.subscribeToPedidos(onPedidoUpdate, connectionStateHandler);
  let stockCleanup = () => {}; // Función vacía por defecto
  
  if (onStockUpdate) {
    stockCleanup = webSocketService.subscribeToStock(onStockUpdate);
  }
  
  // Devolver función que limpia ambas suscripciones
  return () => {
    pedidoCleanup();
    stockCleanup();
  };
};

export const disconnectPedidoSocket = () => {
  // Esta función ahora no hace nada ya que la gestión de conexión es automática
  console.log('DEPRECATED: Ya no es necesario llamar a disconnectPedidoSocket explícitamente');
};
