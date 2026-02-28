/// <reference types="vite/client" />

// Deklarasi environment variables untuk TypeScript
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Type declaration untuk html2pdf.js (tidak punya @types resmi)
declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, any>;
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: 'portrait' | 'landscape';
    };
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
  }

  interface Html2PdfInstance {
    set(options: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement | string): Html2PdfInstance;
    save(): Promise<void>;
    output(type: string): Promise<any>;
    toPdf(): Html2PdfInstance;
    get(type: string): Promise<any>;
  }

  function html2pdf(): Html2PdfInstance;
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2PdfInstance;

  export = html2pdf;
}

// Type declaration untuk html5-qrcode (sudah ada di npm tapi tambahkan sebagai backup)
declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraIdOrConfig: string | { facingMode: string },
      config: {
        fps?: number;
        qrbox?: number | ((w: number, h: number) => { width: number; height: number });
        aspectRatio?: number;
      },
      onScanSuccess: (decodedText: string, decodedResult: any) => void,
      onScanFailure?: (errorMessage: string) => void
    ): Promise<void>;
    stop(): Promise<void>;
    isScanning: boolean;
  }
}
