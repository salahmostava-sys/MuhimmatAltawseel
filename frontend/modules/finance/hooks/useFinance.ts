import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { financeService, type CreateTransactionInput } from '@services/financeService';
import { supabase } from '@services/supabase/client';
import { useToast } from '@shared/hooks/use-toast';
import { getErrorMessage } from '@services/serviceError';

export function useFinance() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { selectedMonth } = useTemporalContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = ['finance', uid, selectedMonth];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    enabled,
    queryFn: () => financeService.getMonthlySummary(selectedMonth),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateTransactionInput) => financeService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ title: 'تم إضافة العملية بنجاح' });
    },
    onError: (e) => {
      toast({ title: 'خطأ', description: getErrorMessage(e), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ title: 'تم الحذف' });
    },
    onError: (e) => {
      toast({ title: 'خطأ في الحذف', description: getErrorMessage(e), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; description?: string; amount?: number }) => financeService.update(params.id, params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => {
      toast({ title: 'خطأ في التعديل', description: getErrorMessage(e), variant: 'destructive' });
    },
  });

  const syncSalaries = useMutation({
    mutationFn: () => financeService.syncSalariesAsExpenses(selectedMonth),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ title: 'تم مزامنة الرواتب' });
    },
    onError: (e) => {
      toast({ title: 'خطأ في المزامنة', description: getErrorMessage(e), variant: 'destructive' });
    },
  });

  const revenue = data?.revenue ?? 0;
  const expenses = data?.expenses ?? 0;
  const balance = data?.balance ?? 0;
  const transactions = data?.transactions ?? [];

  const revenueItems = transactions.filter(t => t.type === 'revenue');
  const expenseItems = transactions.filter(t => t.type === 'expense');

  // Platform performance data for smart recommendations
  const { data: platformStats } = useQuery({
    queryKey: ['finance', uid, 'platform-stats', selectedMonth],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const [y, m] = selectedMonth.split('-');
      const from = `${y}-${m}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const to = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

      // Paginate to avoid Supabase 1000 row default limit
      const allOrders: { app_id: string; orders_count: number; apps: { name: string } | null }[] = [];
      let offset = 0;
      const PAGE = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data: chunk } = await supabase
          .from('daily_orders')
          .select('app_id, orders_count, apps(name)')
          .gte('date', from)
          .lte('date', to)
          .range(offset, offset + PAGE - 1);
        allOrders.push(...(chunk ?? []));
        hasMore = (chunk?.length ?? 0) === PAGE;
        offset += PAGE;
      }
      const orders = allOrders;

      const { data: salaries } = await supabase
        .from('salary_records')
        .select('net_salary')
        .eq('month_year', selectedMonth);

      // Group orders by platform
      const platformMap = new Map<string, { name: string; orders: number; appId: string }>();
      (orders ?? []).forEach((row: { app_id: string; orders_count: number; apps: { name: string } | null }) => {
        const name = row.apps?.name ?? row.app_id;
        const existing = platformMap.get(name) ?? { name, orders: 0, appId: row.app_id };
        existing.orders += row.orders_count ?? 0;
        platformMap.set(name, existing);
      });

      // Get salary breakdown per platform from salary engine preview
      const { data: previewData } = await supabase.functions.invoke('salary-engine', {
        body: { mode: 'month_preview', month_year: selectedMonth },
      });
      const preview = ((previewData as { data?: unknown[] })?.data ?? previewData ?? []) as Array<{
        platform_breakdown?: Array<{ app_name: string; earnings: number }>;
        net_salary?: number;
      }>;

      // Sum salary per platform
      const platformSalaryMap = new Map<string, number>();
      let totalSalaries = 0;
      for (const row of preview) {
        totalSalaries += Number(row.net_salary ?? 0);
        for (const pb of (row.platform_breakdown ?? [])) {
          platformSalaryMap.set(pb.app_name, (platformSalaryMap.get(pb.app_name) ?? 0) + (pb.earnings ?? 0));
        }
      }

      // Match revenue from finance_transactions to platforms
      const { data: financeData } = await supabase
        .from('finance_transactions')
        .select('description, amount')
        .eq('month_year', selectedMonth)
        .eq('type', 'revenue');

      const platformRevenueMap = new Map<string, number>();
      for (const ft of (financeData ?? [])) {
        const desc = (ft.description ?? '').toLowerCase();
        for (const [name] of platformMap) {
          if (desc.includes(name.toLowerCase())) {
            platformRevenueMap.set(name, (platformRevenueMap.get(name) ?? 0) + (ft.amount ?? 0));
          }
        }
      }

      return {
        platforms: [...platformMap.values()].map(p => ({
          ...p,
          salary: platformSalaryMap.get(p.name) ?? 0,
          revenue: platformRevenueMap.get(p.name) ?? 0,
        })).sort((a, b) => b.orders - a.orders),
        totalSalaries,
      };
    },
  });

  return {
    loading: isLoading,
    error,
    refetch,
    revenue,
    expenses,
    balance,
    transactions,
    revenueItems,
    expenseItems,
    selectedMonth,
    createTransaction: createMutation.mutateAsync,
    deleteTransaction: deleteMutation.mutateAsync,
    syncSalaries: syncSalaries.mutateAsync,
    isSaving: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSyncing: syncSalaries.isPending,
    updateTransaction: updateMutation.mutateAsync,
    platformStats: platformStats ?? null,
  };
}
