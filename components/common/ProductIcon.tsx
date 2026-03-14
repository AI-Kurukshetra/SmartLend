'use client'

import { DotLottiePlayer } from '@dotlottie/react-player'

interface ProductIconProps {
    size?: number
    className?: string
}

const PRODUCT_ICON_ANIMATION_ID = '45826f7c-f625-4c2f-8f30-00d5db1320da'

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
            <DotLottiePlayer
                src="/product-icon.lottie"
                activeAnimationId={PRODUCT_ICON_ANIMATION_ID}
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    )
}
