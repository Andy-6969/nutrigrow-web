import { useAuth } from '@/shared/context/AuthContext';
import type { AppRole } from '@/shared/types/global.types';

/**
 * Thin wrapper around useAuth that provides role-based helper functions.
 * All role data now comes from the database via AuthContext — never from email strings.
 */
export function useRBAC() {
  const { profile, role, isLoading, session } = useAuth();

  /**
   * Check if the current user has one of the allowed roles.
   */
  const hasRole = (...allowedRoles: AppRole[]): boolean => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  /**
   * Feature-gate map based on the NutriGrow privilege matrix:
   *
   * | Feature           | super_admin | pemilik_kebun | guest |
   * |-------------------|:-----------:|:-------------:|:-----:|
   * | monitoring        |      ✅     |      ✅       |  ❌   |
   * | override          |      ✅     |      ✅       |  ❌   |
   * | schedules         |      ✅     |      ✅       |  ❌   |
   * | eco_savings       |      ✅     |      ✅       |  ❌   |
   * | devices           |      ✅     |      ❌       |  ❌   |
   * | user_management   |      ✅     |      ❌       |  ❌   |
   * | settings          |      ✅     |      ❌       |  ❌   |
   */
  const canAccess = (
    feature:
      | 'monitoring'
      | 'override'
      | 'schedules'
      | 'eco_savings'
      | 'devices'
      | 'user_management'
      | 'settings'
      | 'notifications'
  ): boolean => {
    if (!role || role === 'guest') return false;

    switch (feature) {
      // Operational features — both active roles
      case 'monitoring':
      case 'override':
      case 'schedules':
      case 'eco_savings':
      case 'notifications':
        return hasRole('super_admin', 'pemilik_kebun');

      // Admin-only features
      case 'devices':
      case 'user_management':
      case 'settings':
        return hasRole('super_admin');

      default:
        return false;
    }
  };

  /**
   * Check if user can issue commands to a specific zone.
   * super_admin → all zones
   * pemilik_kebun → only their assigned_zones
   * guest → none
   */
  const canControlZone = (zoneId: string): boolean => {
    if (!role || role === 'guest') return false;
    if (role === 'super_admin') return true;
    return profile?.assigned_zones?.includes(zoneId) ?? false;
  };

  return {
    /** Full profile from user_profiles table */
    user: profile,
    role,
    isLoading,
    /** Raw Supabase session — use session.access_token for VPS Bearer auth */
    session,
    hasRole,
    canAccess,
    canControlZone,
  };
}
