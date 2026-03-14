/**
 * Returns the canonical base URL for the app, in priority order:
 *  1. NEXT_PUBLIC_SITE_URL  — explicitly set (prod Vercel env var)
 *  2. VERCEL_URL            — auto-injected by Vercel for preview deployments
 *  3. localhost fallback    — local dev
 *
 * Always returns a URL *without* a trailing slash.
 */
export function getSiteUrl(): string {
    // Explicitly configured production URL
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    }

    // Vercel preview / branch deployments (no scheme prefix)
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
    }

    // Local development
    return 'http://localhost:3000'
}
