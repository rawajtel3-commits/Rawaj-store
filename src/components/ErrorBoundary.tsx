import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare readonly props: Readonly<ErrorBoundaryProps>;
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Intentionally silent in production to avoid exposing component stacks or debug details
  }

  private handleReload = () => {
    window.location.assign('/');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6"
        >
          <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">تعذر عرض الصفحة مؤقتاً</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                حدث خطأ غير متوقع أثناء تشغيل الواجهة. تم إخفاء التفاصيل التقنية لحماية أمان بياناتك.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة تحميل المتجر
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
