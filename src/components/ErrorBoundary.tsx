import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onOpenErrorModal?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.addLog(
      'error',
      'React:ErrorBoundary',
      error.message || 'Render Error',
      { componentStack: errorInfo.componentStack },
      error.stack
    );
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl my-4 space-y-4 text-left">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">
                {this.props.fallbackTitle || 'Terjadi Galat saat Menampilkan Komponen Ini'}
              </h3>
              <p className="text-xs text-red-600 font-mono mt-0.5">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReload}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Muat Ulang</span>
            </button>

            {this.props.onOpenErrorModal && (
              <button
                onClick={this.props.onOpenErrorModal}
                className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-700 font-semibold text-xs hover:bg-red-50 flex items-center gap-1.5 shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Lihat Log Error & Diagnostik</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
