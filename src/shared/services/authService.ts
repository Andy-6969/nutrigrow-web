import { supabase } from '@/shared/lib/supabase';

export interface IAuthService {
  loginWithGoogle(): Promise<void>;
  loginWithEmail(email: string, password: string): Promise<void>;
  registerWithEmail(email: string, password: string, fullName: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  logout(): Promise<void>;
  getSessionToken(): Promise<string | null>;
}

// Cookie helpers (client-side only)
const AUTH_COOKIE = 'ng-auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function setAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE}=1; path=/; SameSite=Lax; max-age=${COOKIE_MAX_AGE}`;
  }
}

function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  }
}

export class SupabaseAuthService implements IAuthService {
  async loginWithGoogle(): Promise<void> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) throw error;
    // Cookie is set by the /auth/callback page after OAuth completes
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthCookie();
  }

  async registerWithEmail(
    email: string,
    password: string,
    fullName: string
  ): Promise<void> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) throw error;

    // Only set cookie if a session was returned (email confirmation disabled)
    // If email confirmation is required, session will be null
    if (data.session) {
      setAuthCookie();
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    });

    if (error) throw error;
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearAuthCookie();
  }

  async getSessionToken(): Promise<string | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session) return null;
    return session.access_token;
  }
}

// Helpers exported for use in pages that bypass Supabase (demo mode)
export { setAuthCookie, clearAuthCookie };

// Singleton instance
export const authService = new SupabaseAuthService();
