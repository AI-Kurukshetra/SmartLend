import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs)
}

export function formatUiLabel(value: string | null | undefined) {
    if (!value) return ''

    return value
        .replaceAll('.', ' ')
        .replaceAll('_', ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase())
}
