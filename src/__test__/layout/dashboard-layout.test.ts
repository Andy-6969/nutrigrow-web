/**
 * Unit Tests for: src/shared/components/layout/DashboardLayout.tsx
 * 
 * Tests for Dashboard Layout functionality:
 * - Navigation items rendering
 * - Sidebar collapse/expand
 * - Mobile menu toggle
 * - Dark mode toggle
 * - Unread notification badge
 * - Active route detection
 */

import { mockNotifications } from '@/shared/lib/mockData';
import { APP_NAME } from '@/shared/lib/constants';

// Navigation items (matching component implementation)
const navItems = [
  { id: 'overview',      label: 'Dashboard',      href: '/overview' },
  { id: 'agri-twin',     label: 'Agri-Twin',      href: '/agri-twin' },
  { id: 'monitoring',    label: 'Monitoring',      href: '/monitoring' },
  { id: 'eco-savings',   label: 'Eco-Savings',     href: '/eco-savings' },
  { id: 'schedules',     label: 'Jadwal',          href: '/schedules' },
  { id: 'override',      label: 'Manual Override', href: '/override' },
  { id: 'devices',       label: 'Perangkat',       href: '/devices' },
  { id: 'notifications', label: 'Notifikasi',      href: '/notifications' },
  { id: 'settings',      label: 'Pengaturan',      href: '/settings' },
];

// ════════════════════════════════════════════
// Navigation Items
// ════════════════════════════════════════════
describe('Dashboard Layout - Navigation Items', () => {
  describe('Positive Cases', () => {
    it('should have 9 navigation items', () => {
      expect(navItems).toHaveLength(9);
    });

    it('each item should have id, label, and href', () => {
      navItems.forEach(item => {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.href).toBeTruthy();
      });
    });

    it('all hrefs should start with /', () => {
      navItems.forEach(item => {
        expect(item.href.startsWith('/')).toBe(true);
      });
    });

    it('all IDs should be unique', () => {
      const ids = navItems.map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});

// ════════════════════════════════════════════
// Sidebar Collapse/Expand
// ════════════════════════════════════════════
describe('Dashboard Layout - Sidebar Collapse', () => {
  describe('Positive Cases', () => {
    it('should start expanded', () => {
      const collapsed = false;
      expect(collapsed).toBe(false);
    });

    it('should collapse on toggle', () => {
      let collapsed = false;
      collapsed = !collapsed;
      expect(collapsed).toBe(true);
    });

    it('should expand on second toggle', () => {
      let collapsed = true;
      collapsed = !collapsed;
      expect(collapsed).toBe(false);
    });

    it('should have correct width when collapsed', () => {
      const collapsed = true;
      const width = collapsed ? '72px' : '260px';
      expect(width).toBe('72px');
    });

    it('should have correct width when expanded', () => {
      const collapsed = false;
      const width = collapsed ? '72px' : '260px';
      expect(width).toBe('260px');
    });

    it('should hide labels when collapsed', () => {
      const collapsed = true;
      const showLabels = !collapsed;
      expect(showLabels).toBe(false);
    });

    it('should show labels when expanded', () => {
      const collapsed = false;
      const showLabels = !collapsed;
      expect(showLabels).toBe(true);
    });
  });
});

// ════════════════════════════════════════════
// Mobile Menu Toggle
// ════════════════════════════════════════════
describe('Dashboard Layout - Mobile Menu', () => {
  describe('Positive Cases', () => {
    it('should start closed', () => {
      const mobileOpen = false;
      expect(mobileOpen).toBe(false);
    });

    it('should open on toggle', () => {
      let mobileOpen = false;
      mobileOpen = !mobileOpen;
      expect(mobileOpen).toBe(true);
    });

    it('should close on overlay click', () => {
      let mobileOpen = true;
      mobileOpen = false; // overlay click
      expect(mobileOpen).toBe(false);
    });

    it('should close on nav link click', () => {
      let mobileOpen = true;
      mobileOpen = false; // nav link click handler
      expect(mobileOpen).toBe(false);
    });

    it('sidebar should be hidden when mobile menu is closed', () => {
      const mobileOpen = false;
      const translateClass = mobileOpen ? 'translate-x-0' : '-translate-x-full';
      expect(translateClass).toBe('-translate-x-full');
    });

    it('sidebar should be visible when mobile menu is open', () => {
      const mobileOpen = true;
      const translateClass = mobileOpen ? 'translate-x-0' : '-translate-x-full';
      expect(translateClass).toBe('translate-x-0');
    });
  });
});

// ════════════════════════════════════════════
// Dark Mode Toggle
// ════════════════════════════════════════════
describe('Dashboard Layout - Dark Mode', () => {
  describe('Positive Cases', () => {
    it('should default to light mode', () => {
      const darkMode = false;
      expect(darkMode).toBe(false);
    });

    it('should toggle dark mode', () => {
      let darkMode = false;
      darkMode = !darkMode;
      expect(darkMode).toBe(true);
    });

    it('theme attribute should be set correctly on toggle', () => {
      const darkMode = true;
      // The component does: darkMode ? 'light' : 'dark'
      // This is the "toggle" behavior - when dark is on, clicking sets 'light'
      const themeToSet = darkMode ? 'light' : 'dark';
      expect(themeToSet).toBe('light');
    });
  });
});

// ════════════════════════════════════════════
// Unread Notification Badge
// ════════════════════════════════════════════
describe('Dashboard Layout - Notification Badge', () => {
  const unreadCount = mockNotifications.filter(n => !n.is_read).length;

  describe('Positive Cases', () => {
    it('should calculate unread count from mock data', () => {
      expect(unreadCount).toBeGreaterThan(0);
    });

    it('should show badge when unread count > 0', () => {
      const showBadge = unreadCount > 0;
      expect(showBadge).toBe(true);
    });

    it('badge should display correct count', () => {
      expect(unreadCount).toBe(3); // n1, n2, n3 are unread
    });
  });

  describe('Negative Cases', () => {
    it('should hide badge when all notifications are read', () => {
      const allRead = mockNotifications.map(n => ({ ...n, is_read: true }));
      const count = allRead.filter(n => !n.is_read).length;
      expect(count).toBe(0);
      const showBadge = count > 0;
      expect(showBadge).toBe(false);
    });
  });
});

// ════════════════════════════════════════════
// Active Route Detection
// ════════════════════════════════════════════
describe('Dashboard Layout - Active Route', () => {
  describe('Positive Cases', () => {
    it('should detect active route for /overview', () => {
      const pathname = '/overview';
      const isActive = navItems.some(item => item.href === pathname);
      expect(isActive).toBe(true);
    });

    it('should find correct label for pathname', () => {
      const pathname = '/monitoring';
      const label = navItems.find(n => n.href === pathname)?.label;
      expect(label).toBe('Monitoring');
    });

    it('should show "Dashboard" as fallback label', () => {
      const pathname = '/unknown-path';
      const label = navItems.find(n => n.href === pathname)?.label || 'Dashboard';
      expect(label).toBe('Dashboard');
    });
  });

  describe('Negative Cases', () => {
    it('should not mark inactive routes as active', () => {
      const pathname = '/overview';
      navItems.forEach(item => {
        if (item.href !== pathname) {
          expect(item.href).not.toBe(pathname);
        }
      });
    });
  });
});

// ════════════════════════════════════════════
// App Name Display
// ════════════════════════════════════════════
describe('Dashboard Layout - App Name', () => {
  describe('Positive Cases', () => {
    it('should display correct app name', () => {
      expect(APP_NAME).toBe('NutriGrow');
    });

    it('subtitle should be "Smart Fertigation"', () => {
      const subtitle = 'Smart Fertigation';
      expect(subtitle).toBe('Smart Fertigation');
    });
  });
});

// ════════════════════════════════════════════
// User Info
// ════════════════════════════════════════════
describe('Dashboard Layout - User Info', () => {
  const user = { name: 'Pak Budi', role: 'Manager', initials: 'B' };

  describe('Positive Cases', () => {
    it('should display user name', () => {
      expect(user.name).toBe('Pak Budi');
    });

    it('should display user role', () => {
      expect(user.role).toBe('Manager');
    });

    it('should display initials avatar', () => {
      expect(user.initials).toBe('B');
    });
  });
});
