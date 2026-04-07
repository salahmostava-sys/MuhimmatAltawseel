import { useMemo } from 'react';
import { useAuthedQuery } from '@shared/hooks/useAuthedQuery';
import {
  commercialRecordService,
  type CommercialRecordItem,
} from '@services/commercialRecordService';

export const commercialRecordsQueryKey = (uid: string) => ['commercial-records', uid] as const;

export const useCommercialRecords = () => {
  const query = useAuthedQuery({
    buildQueryKey: commercialRecordsQueryKey,
    queryFn: () => commercialRecordService.listCatalog(),
    notifyOnError: false,
    staleTime: 60_000,
  });

  const recordNames = useMemo(
    () =>
      (query.data?.records ?? [])
        .map((record: CommercialRecordItem) => record.name)
        .filter(Boolean),
    [query.data?.records],
  );

  return {
    ...query,
    tableAvailable: query.data?.tableAvailable ?? false,
    records: query.data?.records ?? [],
    recordNames,
  };
};

