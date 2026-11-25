import { formatDateTimeWIB } from './dateUtils';

export interface AppLogEntry {
  id: string;
  timestamp: string;
  timestampWIB: string;
  level: 'error' | 'warn' | 'info';
  source: string;
  message: string;
  details?: any;
  stack?: string;
}

function isIgnorableError(message?: string, filename?: string, stack?: string): boolean {
  const combined = `${message || ''} ${filename || ''} ${stack || ''}`.toLowerCase();
  if (!combined.trim()) return false;
  return (
    combined.includes('websocket') ||
    combined.includes('[vite]') ||
    combined.includes('vite:ws') ||
    combined.includes('failed to connect to websocket') ||
    combined.includes('websocket closed') ||
    combined.includes('chrome-extension://') ||
    combined.includes('moz-extension://') ||
    combined.includes('safari-extension://') ||
    combined.includes('cannot set property fetch of #<window>')
  );
}

class AppLogger {
  private static instance: AppLogger;
  private logs: AppLogEntry[] = [];
  private listeners: (() => void)[] = [];
  private initialized = false;

  private constructor() {
    this.initGlobalListeners();
  }

  public static getInstance(): AppLogger {
    if (!AppLogger.instance) {
      AppLogger.instance = new AppLogger();
    }
    return AppLogger.instance;
  }

  private initGlobalListeners() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    // Window Uncaught Error Listener
    window.addEventListener('error', (event) => {
      const msg = event.message || 'Unknown window error';
      if (isIgnorableError(msg, event.filename, event.error?.stack)) return;

      this.addLog(
        'error',
        'Window:Uncaught',
        msg,
        { filename: event.filename, lineno: event.lineno, colno: event.colno },
        event.error?.stack
      );
    });

    // Unhandled Promise Rejection Listener
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : (reason?.message || 'Unhandled Promise Rejection');
      if (isIgnorableError(message, undefined, reason?.stack)) return;

      this.addLog(
        'error',
        'Window:PromiseRejection',
        message,
        reason,
        reason?.stack
      );
    });

    // Intercept console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      try {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        if (isIgnorableError(msg)) return;
        const errObj = args.find(a => a instanceof Error);
        this.addLog('error', 'Console:Error', msg, args, errObj?.stack);
      } catch (e) {
        // Ignore serialization issues
      }
    };
  }

  public addLog(
    level: 'error' | 'warn' | 'info',
    source: string,
    message: string,
    details?: any,
    stack?: string
  ): AppLogEntry | null {
    if (isIgnorableError(message)) {
      return null;
    }

    const now = new Date();
    const entry: AppLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toISOString(),
      timestampWIB: formatDateTimeWIB(now),
      level,
      source,
      message,
      details,
      stack
    };

    this.logs.unshift(entry);
    // Keep maximum 200 logs
    if (this.logs.length > 200) {
      this.logs.pop();
    }

    this.notify();
    this.forwardToBackend(entry);
    return entry;
  }

  private forwardToBackend(entry: AppLogEntry) {
    if (typeof window === 'undefined') return;
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: entry.level,
          source: entry.source,
          message: entry.message,
          details: entry.details,
          stack: entry.stack
        })
      }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  public getLogs(): AppLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        // Ignore listener error
      }
    });
  }
}

export const logger = AppLogger.getInstance();
