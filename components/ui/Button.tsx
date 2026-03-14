'use client'

import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    fullWidth?: boolean
    children: React.ReactNode
}

export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    children,
    className,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <>
            <button
                className={cn('btn', `btn-${variant}`, `btn-${size}`, fullWidth && 'btn-full', className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <span className="btn-spinner" aria-label="Loading" />
                ) : null}
                <span className={loading ? 'btn-content-loading' : 'btn-content'}>
                    {children}
                </span>
            </button>
            <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
          position: relative;
          border: none;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
        .btn-full {
          width: 100%;
        }
        /* Sizes */
        .btn-sm {
          padding: 8px 16px;
          font-size: 0.8125rem;
        }
        .btn-md {
          padding: 12px 24px;
          font-size: 0.9375rem;
        }
        .btn-lg {
          padding: 15px 32px;
          font-size: 1rem;
        }
        /* Variants */
        .btn-primary {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: var(--white);
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.35);
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #6d28d9, #5b21b6);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-secondary {
          background: var(--pastel-lavender-light);
          color: var(--brand-primary);
        }
        .btn-secondary:hover:not(:disabled) {
          background: var(--pastel-lavender);
          transform: translateY(-1px);
        }
        .btn-ghost {
          background: transparent;
          color: var(--color-text-secondary);
        }
        .btn-ghost:hover:not(:disabled) {
          background: var(--gray-100);
          color: var(--color-text-primary);
        }
        .btn-outline {
          background: transparent;
          color: var(--brand-primary);
          border: 1.5px solid var(--brand-primary);
        }
        .btn-outline:hover:not(:disabled) {
          background: var(--pastel-lavender-light);
          transform: translateY(-1px);
        }
        /* Spinner */
        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          position: absolute;
        }
        .btn-content {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-content-loading {
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </>
    )
}
