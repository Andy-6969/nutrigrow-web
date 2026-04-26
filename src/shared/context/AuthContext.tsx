'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import type { UserProfile, AppRole } from '@/shared/types/global.types';

// ─── Context Shape ────────────────────────────────────────────
interface AuthContextValue {
  /** Full Supabase session — contains access_token for VPS API calls */
  session: Session | null;
  /** Resolved user profile fetched from user_profiles table */
  profile: UserProfile | null;
  /** Shorthand role for quick checks */
  role: AppRole | null;
  /** True while session + profile are being resolved */
  isLoading: boolean;
  /** True once auth state has been determined at least once */
  isInitialized: boolean;
  /** Convenience: is user authenticated AND not a guest */
  isAuthorized: boolean;
  /** Logout helper — clears session and cookie */
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Cookie helpers ───────────────────────────────────────────
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

// ─── Profile Fetcher ─────────────────────────────────────────
// Joins the `roles` table via FK to resolve the role name string.
// Normalizes column differences between old schema (role TEXT, full_name)
// and new schema (role_id FK, nama).
async function fetchUserProfile(
  userId: string,
  fallbacks?: { email?: string; fullName?: string }
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, roles(name)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[AuthContext] Failed to fetch user_profiles:', error.message);
      return null;
    }

    // Resolve role: prefer joined roles.name, fall back to direct role column
    const rolesRelation = data.roles as { name: string } | null;
    const resolvedRole: AppRole =
      (rolesRelation?.name as AppRole) ?? data.role ?? 'guest';

    // Normalize DB response into a consistent UserProfile shape
    const profile: UserProfile = {
      id: data.id,
      email: data.email ?? fallbacks?.email ?? '',
      full_name: data.nama ?? data.full_name ?? fallbacks?.fullName ?? '',
      role: resolvedRole,
      role_id: data.role_id ?? null,
      is_active: data.is_active ?? true,
      avatar_url: data.avatar_url ?? null,
      farm_id: data.farm_id ?? null,
      assigned_zones: data.assigned_zones ?? [],
      created_at: data.created_at ?? '',
    };

    return profile;
  } catch (err) {
    console.error('[AuthContext] Unexpected error fetching profile:', err);
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const resolveSession = useCallback(async (newSession: Session | null) => {
    setIsLoading(true);
    try {
      if (newSession) {
        setSession(newSession);
        setAuthCookie();
        const fallbacks = {
          email: newSession.user.email ?? undefined,
          fullName: newSession.user.user_metadata?.full_name ?? undefined,
        };

        let userProfile = await fetchUserProfile(newSession.user.id, fallbacks);

        // If profile was deleted (user was kicked), auto-create as guest (re-quarantine)
        if (!userProfile) {
          console.warn('[AuthContext] Profile not found — re-creating as guest (quarantine).');
          const { data: guestRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'guest')
            .single();

          if (guestRole) {
            await supabase.from('user_profiles').insert({
              id: newSession.user.id,
              email: newSession.user.email,
              nama: newSession.user.user_metadata?.full_name ?? null,
              avatar_url: newSession.user.user_metadata?.avatar_url ?? null,
              role_id: guestRole.id,
              is_active: true,
            });
            userProfile = await fetchUserProfile(newSession.user.id, fallbacks);
          }
        }

        setProfile(userProfile);
      } else {
        setSession(null);
        setProfile(null);
        clearAuthCookie();
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    // 1. Get initial session on mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      resolveSession(initialSession);
    });

    // 2. Listen to auth state changes (login, logout, token refresh, recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, changedSession) => {
        if (_event === 'PASSWORD_RECOVERY') {
          // Force redirect to update-password page immediately
          if (typeof window !== 'undefined') {
            window.location.href = '/update-password';
          }
          return;
        }
        resolveSession(changedSession);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [resolveSession]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearAuthCookie();
    // State update happens automatically via onAuthStateChange
  }, []);

  const role = profile?.role ?? null;
  const isAuthorized = !!session && role !== null && role !== 'guest';

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        role,
        isLoading,
        isInitialized,
        isAuthorized,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
