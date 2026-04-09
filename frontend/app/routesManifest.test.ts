import { describe, expect, it } from 'vitest';
import { routesManifest, routeGroupTitleAr, routePermission, type RouteGroup } from './routesManifest';
import { PERMISSION_PAGE_ENTRIES } from '@shared/constants/permissionPages';

describe('routesManifest', () => {
  it('uses unique paths for sidebar entries', () => {
    const paths = routesManifest.filter((r) => r.sidebar).map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('defines an Arabic title for every route group in use', () => {
    const groups = new Set<RouteGroup>();
    routesManifest.forEach((r) => groups.add(r.group));
    groups.forEach((g) => {
      expect(routeGroupTitleAr[g]).toMatch(/\S/);
    });
  });

  it('uses view_ permission tokens for gated sidebar routes', () => {
    for (const r of routesManifest) {
      if (!r.sidebar || !r.permission) continue;
      expect(r.permission).toBe(routePermission(r.permission.replace(/^view_/, '')));
    }
  });

  it('keeps permission-page entries in sync with gated routes', () => {
    const entryKeys = new Set(PERMISSION_PAGE_ENTRIES.map((entry) => entry.key));

    for (const route of routesManifest) {
      if (!route.sidebar || !route.permission) continue;
      expect(entryKeys.has(route.permission.replace(/^view_/, ''))).toBe(true);
    }
  });

  it('keeps dashboard root without permission (always reachable when authenticated)', () => {
    const dash = routesManifest.find((r) => r.id === 'dashboard');
    expect(dash?.path).toBe('/');
    expect(dash?.permission).toBeUndefined();
  });
});
