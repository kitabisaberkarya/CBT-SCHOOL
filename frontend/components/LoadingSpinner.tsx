
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
  color?: string;
  fullPage?: boolean;
}

/**
 * LoadingSpinner — Komponen spinner inline/halaman penuh yang konsisten.
 * Digunakan saat fetch data, submit form, dsb.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className = '',
  color = '#2563eb',
  fullPage = false,
}) => {
  const sizeMap = { sm: 20, md: 32, lg: 48 };
  const px = sizeMap[size];

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div style={{ width: px, height: px, position: 'relative' }}>
        {/* Outer ring */}
        <svg
          style={{ width: px, height: px, animation: 'spin 1.2s linear infinite', position: 'absolute', top: 0, left: 0 }}
          viewBox="0 0 50 50"
          fill="none"
        >
          <circle cx="25" cy="25" r="20" stroke={color} strokeOpacity="0.15" strokeWidth="5" />
          <path
            d="M25 5 A20 20 0 0 1 45 25"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        {/* Inner dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: px * 0.25,
            height: px * 0.25,
            borderRadius: '50%',
            background: color,
            opacity: 0.6,
            animation: 'pulse 1.2s ease-in-out infinite',
          }}
        />
      </div>
      {message && (
        <p
          className="text-sm font-medium text-gray-500"
          style={{ animation: 'fadeInPulse 1.4s ease-in-out infinite' }}
        >
          {message}
        </p>
      )}
      <style>{`
        @keyframes fadeInPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
