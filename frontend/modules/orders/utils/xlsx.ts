let _cache: Promise<typeof import('@e965/xlsx')> | null = null;
/** Cached dynamic import — resolves the same promise on repeated calls. */
export const loadXlsx = () => {
  if (!_cache) _cache = import('@e965/xlsx');
  return _cache;
};
