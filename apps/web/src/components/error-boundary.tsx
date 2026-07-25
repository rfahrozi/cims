import React, { type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Di produksi, Anda bisa mengirim ini ke Sentry, Datadog, dsb.
    console.error('Unhandled React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <AlertOctagon className="h-8 w-8 text-rose-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-rose-900">
            Terjadi Kesalahan Antarmuka
          </h2>
          <p className="mb-6 max-w-md text-sm text-rose-700">
            Aplikasi mengalami kesalahan yang tidak terduga saat memuat komponen ini.
            Silakan segarkan halaman untuk memulihkan sesi Anda.
          </p>

          {this.state.error && (
            <div className="mb-6 max-w-2xl overflow-auto rounded border border-rose-200 bg-white p-3 text-left">
              <code className="text-[11px] text-rose-800">
                {this.state.error.message}
              </code>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Segarkan Halaman
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '/dashboard';
              }}
              className="border-rose-200 text-rose-800 hover:bg-rose-100"
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
