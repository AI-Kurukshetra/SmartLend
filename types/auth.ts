export interface AuthFormState {
    error: string | null
    loading: boolean
}

export interface UserProfile {
    id: string
    email: string | undefined
    full_name?: string
    avatar_url?: string
    created_at?: string
}
