import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@app/providers/AuthContext';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { useQueryErrorToast } from '@shared/hooks/useQueryErrorToast';
import { safeRetry, withQueryTimeout } from '@shared/lib/reactQuerySafety';

type UseAuthedPagedQueryParams<TData, TQueryKey extends QueryKey> = {
  buildQueryKey: (uid: string) => TQueryKey;
  queryFn: () => Promise<TData>;
  errorTitle: string;
  staleTime?: number;
  enabled?: boolean;
};

export function useAuthedPagedQuery<TData, TQueryKey extends QueryKey = QueryKey>({
  buildQueryKey,
  queryFn,
  errorTitle,
  staleTime = 15_000,
  enabled = true,
}: UseAuthedPagedQueryParams<TData, TQueryKey>): UseQueryResult<TData> {
  const { user, session } = useAuth();
  const { userId, authReady } = useAuthQueryGate();
  const uid = authQueryUserId(user?.id ?? userId);

  const query = useQuery<TData, Error, TData, TQueryKey>({
    queryKey: buildQueryKey(uid),
    queryFn: () => withQueryTimeout(queryFn()),
    retry: safeRetry as typeof query.options.retry,
    staleTime,
    enabled: !!session && authReady && enabled,
  });

  useQueryErrorToast(query.isError, query.error, errorTitle, query.refetch);
  return query;
}
