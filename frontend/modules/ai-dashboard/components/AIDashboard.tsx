import { useCallback, useEffect, useState } from 'react';
import {
  Brain,
  Database,
  DollarSign,
  Info,
  Loader2,
  Minus,
  RefreshCcw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { aiService, type SalaryForecastResponse } from '@services/aiService';
import { useToast } from '@shared/hooks/use-toast';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';

interface AIDashboardProps {
  currentOrders?: number | null;
  daysPassed?: number;
}

export function AIDashboard({
  currentOrders = null,
  daysPassed = 15,
}: AIDashboardProps) {
  const { toast } = useToast();
  const [salaryForecast, setSalaryForecast] = useState<SalaryForecastResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const normalizedOrders = currentOrders == null ? null : Math.max(0, currentOrders);
  const normalizedDaysPassed = Math.max(1, Math.min(daysPassed, 30));

  const loadSalaryForecast = useCallback(async () => {
    if (normalizedOrders === null) {
      setSalaryForecast(null);
      return;
    }

    setLoadingForecast(true);

    try {
      const result = await aiService.predictSalary({
        current_orders: normalizedOrders,
        days_passed: normalizedDaysPassed,
        avg_order_value: 5.5,
        base_salary: 0,
        working_days_per_month: 30,
      });

      setSalaryForecast(result);
    } catch {
      toast({
        title: 'خطأ في توقع الراتب',
        description: 'تعذر تحميل توقع الراتب من خدمة الذكاء الاصطناعي.',
        variant: 'destructive',
      });
    } finally {
      setLoadingForecast(false);
    }
  }, [normalizedDaysPassed, normalizedOrders, toast]);

  useEffect(() => {
    void loadSalaryForecast();
  }, [loadSalaryForecast]);

  const getTrendIcon = (trend: string) => {
    if (trend === 'above_target') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'below_target') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getTrendLabel = (trend: string) => {
    if (trend === 'above_target') return 'أعلى من المستهدف';
    if (trend === 'below_target') return 'أقل من المستهدف';
    return 'ضمن المستهدف';
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    };
    const labels = {
      high: 'عالية',
      medium: 'متوسطة',
      low: 'منخفضة',
    };

    return (
      <Badge variant={variants[confidence] || 'default'}>
        {labels[confidence as keyof typeof labels] || confidence}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-2">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">لوحة التحكم الذكية</h2>
        <Badge variant="outline" className="mr-auto">
          Live AI
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              توقع الراتب الشهري
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingForecast ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : salaryForecast ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {salaryForecast.predicted_monthly_salary.toLocaleString('ar-SA')} ر.س
                  </div>
                  <div className="text-xs text-muted-foreground">
                    الراتب المتوقع لهذا الشهر
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-muted p-2 text-center">
                    <div className="font-medium">
                      {salaryForecast.projected_monthly_orders.toLocaleString('ar-SA')}
                    </div>
                    <div className="text-muted-foreground">طلب متوقع</div>
                  </div>
                  <div className="rounded bg-muted p-2 text-center">
                    <div className="font-medium">
                      {salaryForecast.current_daily_avg.toLocaleString('ar-SA')}
                    </div>
                    <div className="text-muted-foreground">متوسط يومي</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(salaryForecast.trend)}
                    <span>{getTrendLabel(salaryForecast.trend)}</span>
                  </div>
                  {getConfidenceBadge(salaryForecast.confidence)}
                </div>

                <div className="text-xs text-muted-foreground">
                  متبقي {salaryForecast.days_remaining.toLocaleString('ar-SA')} يوم في الشهر
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                لا توجد بيانات طلبات كافية لتوليد التوقع.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              ملخص البيانات الحالية
            </CardTitle>
          </CardHeader>
          <CardContent>
            {normalizedOrders === null ? (
              <div className="space-y-2 py-8 text-center text-sm text-muted-foreground">
                <Info className="mx-auto h-8 w-8 text-muted-foreground/70" />
                <div>بانتظار تحميل بيانات الطلبات للشهر الحالي.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-muted p-3 text-center">
                    <div className="text-lg font-semibold">
                      {normalizedOrders.toLocaleString('ar-SA')}
                    </div>
                    <div className="text-muted-foreground">طلبات الشهر الحالي</div>
                  </div>
                  <div className="rounded bg-muted p-3 text-center">
                    <div className="text-lg font-semibold">
                      {normalizedDaysPassed.toLocaleString('ar-SA')}
                    </div>
                    <div className="text-muted-foreground">أيام منقضية</div>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                  هذا القسم يعتمد الآن على بيانات الطلبات الحقيقية للشهر الجاري بدلًا من أي أرقام ثابتة داخل الواجهة.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert className="h-4 w-4" />
              حالة التكامل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <Badge variant="secondary">تم تعطيل البيانات الوهمية</Badge>
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-3 text-muted-foreground">
                تم إيقاف أقسام "أفضل الموظفين" و"كشف الشذوذ" لأن النسخة السابقة كانت تعتمد على بيانات تجريبية ثابتة داخل الواجهة.
              </div>
              <div className="rounded-lg bg-muted p-3 text-muted-foreground">
                أعد تفعيل هذه الأقسام فقط بعد ربطها بمصادر حقيقية لبيانات الحضور والاستقطاعات والأخطاء التشغيلية.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadSalaryForecast()}
          disabled={normalizedOrders === null || loadingForecast}
          className="gap-2"
        >
          {loadingForecast ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          تحديث التحليل
        </Button>
      </div>
    </div>
  );
}

export default AIDashboard;
