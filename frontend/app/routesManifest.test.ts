import { describe, expect, it } from 'vitest';
import { routesManifest, routeGroupTitleAr, routePermission, type RouteGroup } from './routesManifest';

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

  it('keeps dashboard root without permission (always reachable when authenticated)', () => {
    const dash = routesManifest.find((r) => r.id === 'dashboard');
    expect(dash?.path).toBe('/');
    expect(dash?.permission).toBeUndefined();
  });
});
