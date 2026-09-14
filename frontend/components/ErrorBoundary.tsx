import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /**
   * Komponen fallback kustom (opsional).
   * Jika tidak diberikan, tampilkan UI error default.
   */
  fallback?: ReactNode;
  /**
   * Callback dipanggil setiap kali error tertangkap.
   * Berguna untuk logging ke sistem monitoring.
   */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary untuk CBT School.
 *
 * KENAPA PENTING untuk 5000 siswa:
 * - Tanpa Error Boundary: 1 komponen error → seluruh browser crash → siswa kehilangan progress ujian
 * - Dengan Error Boundary: error ditangkap → tampilkan pesan ramah → siswa bisa refresh/lanjut
 *
 * Gunakan di App.tsx untuk wrap seluruh aplikasi:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * Atau wrap komponen kritis secara individual:
 *   <ErrorBoundary fallback={<div>Soal tidak bisa dimuat</div>}>
 *     <TestScreen ... />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  // Deklarasi eksplisit diperlukan untuk React 19 + TypeScript compatibility
  declare props: Readonly<Props>;
  state: Readonly<State> = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // @ts-ignore — React 19 class component types quirk
    this.setState({ errorInfo: info });

    // Log error ke console (dapat diarahkan ke monitoring tool)
    console.error('[CBT-ErrorBoundary] Error tertangkap:', error);
    console.error('[CBT-ErrorBoundary] Component Stack:', info.componentStack);

    // Panggil callback custom jika disediakan
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  handleReset = () => {
    // @ts-ignore — React 19 class component types quirk
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Tampilkan fallback kustom jika ada
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // UI Error Default — desain ramah untuk siswa
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
            {/* Ikon Error */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5C2.302 18.333 3.264 20 4.804 20z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Terjadi Kesalahan
            </h2>

            <p className="text-gray-500 text-sm mb-6">
              Halaman mengalami gangguan teknis.{' '}
              <span className="font-medium text-gray-700">
                Jawaban Anda yang sudah tersimpan tidak akan hilang.
              </span>{' '}
              Silakan refresh halaman atau hubungi pengawas.
            </p>

            {/* Detail Error (hanya tampil di development mode) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left text-xs bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700">
                <summary className="cursor-pointer font-mono font-semibold mb-1">
                  Detail Error (Dev Mode)
                </summary>
                <p className="font-mono break-all">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-[10px] overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            {/* Tombol Aksi */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                Refresh Halaman
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Coba Lanjutkan
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 break-all px-2">
              {this.state.error?.name}: {this.state.error?.message}
            </p>
          </div>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}

export default ErrorBoundary;
