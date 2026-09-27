type EventCallback = () => void;

class InvalidationEmitter {
  private listeners: Record<string, EventCallback[]> = {};

  subscribe(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return an unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb());
    }
  }
}

export const domainEmitter = new InvalidationEmitter();

export const DOMAIN_EVENTS = {
  REFETCH_JOBS: 'REFETCH_JOBS',
  REFETCH_MEMBERS: 'REFETCH_MEMBERS',
  REFETCH_APPOINTMENTS: 'REFETCH_APPOINTMENTS',
  REFETCH_FINDINGS: 'REFETCH_FINDINGS',
  REFETCH_DEFERRED: 'REFETCH_DEFERRED',
  RECONNECT_SYNC: 'RECONNECT_SYNC' // Mass refresh for active scopes
};
