'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'

interface ProductIconProps {
    size?: number
    className?: string
}

export default function ProductIcon({ size = 32, className }: ProductIconProps) {
    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                lineHeight: 0,
            }}
        >
            <DotLottieReact
                src="/product-icon.lottie"
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    )
}
