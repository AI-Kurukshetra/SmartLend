'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    icon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, rightIcon, className, id, ...props }, ref) => {
        return (
            <div className="input-wrapper">
                {label && (
                    <label htmlFor={id} className="input-label">
                        {label}
                    </label>
                )}
                <div className="input-container">
                    {icon && <span className="input-icon-left">{icon}</span>}
                    <input
                        ref={ref}
                        id={id}
                        className={cn('input-field', icon && 'has-icon-left', rightIcon && 'has-icon-right', error && 'input-error', className)}
                        {...props}
                    />
                    {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
                </div>
                {error && <p className="input-error-msg">{error}</p>}
                <style jsx>{`
          .input-wrapper {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .input-label {
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--color-text-secondary);
            letter-spacing: 0.01em;
          }
          .input-container {
            position: relative;
            display: flex;
            align-items: center;
          }
          .input-field {
            width: 100%;
            padding: 12px 16px;
            background: var(--white);
            border: 1.5px solid var(--gray-200);
            border-radius: var(--radius-md);
            font-size: 0.9375rem;
            color: var(--color-text-primary);
            transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
            outline: none;
          }
          .input-field::placeholder {
            color: var(--gray-400);
          }
          .input-field:focus {
            border-color: var(--brand-primary);
            box-shadow: 0 0 0 3px var(--pastel-lavender-light);
          }
          .input-field.has-icon-left {
            padding-left: 42px;
          }
          .input-field.has-icon-right {
            padding-right: 42px;
          }
          .input-field.input-error {
            border-color: var(--pastel-peach-dark);
          }
          .input-field.input-error:focus {
            box-shadow: 0 0 0 3px var(--pastel-peach-light);
          }
          .input-icon-left {
            position: absolute;
            left: 14px;
            color: var(--gray-400);
            display: flex;
            align-items: center;
            pointer-events: none;
          }
          .input-icon-right {
            position: absolute;
            right: 14px;
            color: var(--gray-400);
            display: flex;
            align-items: center;
          }
          .input-error-msg {
            font-size: 0.75rem;
            color: var(--pastel-peach-dark);
            margin-top: 2px;
          }
        `}</style>
            </div>
        )
    }
)

Input.displayName = 'Input'

export default Input
