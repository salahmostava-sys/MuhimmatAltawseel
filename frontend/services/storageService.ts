import { supabase } from '@services/supabase/client';
import { sanitizeStoragePath } from '@shared/lib/storagePath';
import { toServiceError } from '@services/serviceError';

export const storageService = {
  sanitizePathOrThrow: (path: string) => {
    const safePath = sanitizeStoragePath(path);

    if (!safePath) {
      throw toServiceError(new Error('Invalid storage path'), 'storageService.sanitizePathOrThrow.invalid');
    }

    if (safePath.includes('..') || safePath.startsWith('/') || !/^[A-Za-z0-9/_\-.]+$/.test(safePath)) {
      throw toServiceError(new Error('Unsafe storage path'), 'storageService.sanitizePathOrThrow.unsafe');
    }

    return safePath;
  },

  createSignedUrl: async (bucket: string, path: string, expiresInSeconds = 300) => {
    const safePath = storageService.sanitizePathOrThrow(path);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(safePath, expiresInSeconds);

    if (error) {
      throw toServiceError(error, 'storageService.createSignedUrl');
    }

    return data.signedUrl;
  },
};
