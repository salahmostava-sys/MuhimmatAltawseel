import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { financeService, type CreateTransactionInput } from '@services/financeService';
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
  };
}
