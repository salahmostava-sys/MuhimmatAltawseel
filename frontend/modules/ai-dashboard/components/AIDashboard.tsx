import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@shared/hooks/use-toast';
import { aiService, type SalaryForecastResponse, type EmployeeRank, type Anomaly } from '@services/aiService';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Award, 
  AlertTriangle, 
  AlertCircle,
  Info,
  Loader2,
  DollarSign,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface AIDashboardProps {
  employeeId?: string;
  employeeName?: string;
  currentOrders?: number;
  currentSalary?: number;
  daysPassed?: number;
}

export function AIDashboard({ 
  employeeId = '', 
  employeeName = '', 
  currentOrders = 0,
  currentSalary = 0,
  daysPassed = 15 
}: AIDashboardProps) {
  const { toast } = useToast();
  
  // State for salary forecast
  const [salaryForecast, setSalaryForecast] = useState<SalaryForecastResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  
  // State for best employees
  const [bestEmployees, setBestEmployees] = useState<EmployeeRank[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // State for anomalies
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyStats, setAnomalyStats] = useState<{ risk_score: number; level: string } | null>(null);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);

  // Load AI insights on mount
  useEffect(() => {
    void loadSalaryForecast();
    void loadBestEmployees();
    if (employeeId) {
      void loadAnomalies();
    }
  }, [employeeId, loadSalaryForecast, loadBestEmployees, loadAnomalies]);

  // Salary Forecast
  const loadSalaryForecast = useCallback(async () => {
    setLoadingForecast(true);
    try {
      const result = await aiService.predictSalary({
        current_orders: currentOrders || 450,
        days_passed: daysPassed || 15,
        avg_order_value: 5.5,
        base_salary: 0,
        working_days_per_month: 30,
      });
      setSalaryForecast(result);
    } catch {
      toast({ 
        title: 'خطأ في توقع الراتب', 
        description: 'لم يتمكن الذكاء الاصطناعي من تحليل البيانات',
        variant: 'destructive' 
      });
    } finally {
      setLoadingForecast(false);
    }
  }, [currentOrders, daysPassed, toast]);

  // Best Employees
  const loadBestEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      // Mock data for demo - in production this would come from your employee data
      const mockEmployees = [
        { employee_id: '1', employee_name: 'أحمد محمد', total_orders: 520, attendance_days: 28, error_count: 2, late_days: 1, salary: 2860, avg_orders_per_day: 18.5 },
        { employee_id: '2', employee_name: 'خالد العلي', total_orders: 480, attendance_days: 27, error_count: 3, late_days: 2, salary: 2640, avg_orders_per_day: 17.7 },
        { employee_id: '3', employee_name: 'سعد عبدالله', total_orders: 450, attendance_days: 29, error_count: 1, late_days: 0, salary: 2475, avg_orders_per_day: 15.5 },
        { employee_id: '4', employee_name: 'ناصر Ibrahim', total_orders: 410, attendance_days: 26, error_count: 5, late_days: 3, salary: 2255, avg_orders_per_day: 15.7 },
        { employee_id: '5', employee_name: 'فهد السالم', total_orders: 380, attendance_days: 25, error_count: 4, late_days: 2, salary: 2090, avg_orders_per_day: 15.2 },
      ];
      
      const result = await aiService.bestEmployees(mockEmployees, 5);
      setBestEmployees(result.employees);
    } catch {
      toast({ 
        title: 'خطأ في تحليل الأداء', 
        description: 'لم يتمكن الذكاء الاصطناعي من تقييم الموظفين',
        variant: 'destructive' 
      });
    } finally {
      setLoadingEmployees(false);
    }
  }, [toast]);

  // Anomaly Detection
  const loadAnomalies = useCallback(async () => {
    setLoadingAnomalies(true);
    try {
      const result = await aiService.detectAnomalies({
        employee_id: employeeId,
        employee_name: employeeName || 'الموظف',
        current_salary: currentSalary || 2475,
        expected_salary_range: [2200, 2800],
        monthly_orders: currentOrders || 450,
        previous_month_orders: 520,
        deductions: 150,
        deduction_reasons: ['تأخير', 'خطأ توصيل'],
      });
      
      setAnomalies(result.anomalies);
      setAnomalyStats({ risk_score: result.overall_risk_score, level: result.risk_level });
      
      // Show toast for critical anomalies
      const criticalAnomalies = result.anomalies.filter(a => a.severity === 'critical');
      if (criticalAnomalies.length > 0) {
        toast({
          title: '⚠️ تنبيهات حرجة',
          description: `تم اكتشاف ${criticalAnomalies.length} مشكلة تتطلب اهتمامك الفوري`,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ 
        title: 'خطأ في الكشف عن الشذوذ', 
        description: 'لم يتمكن الذكاء الاصطناعي من تحليل البيانات',
        variant: 'destructive' 
      });
    } finally {
      setLoadingAnomalies(false);
    }
  }, [employeeId, employeeName, currentSalary, currentOrders, toast]);

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
    const labels = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
    return <Badge variant={variants[confidence] || 'default'}>{labels[confidence] || confidence}</Badge>;
  };

  const getPerformanceColor = (tier: string) => {
    const colors: Record<string, string> = {
      excellent: 'bg-green-100 text-green-800 border-green-300',
      good: 'bg-blue-100 text-blue-800 border-blue-300',
      average: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      needs_improvement: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  const _getPerformanceLabel = (tier: string) => {
    const labels: Record<string, string> = {
      excellent: 'ممتاز',
      good: 'جيد',
      average: 'متوسط',
      needs_improvement: 'يحتاج تحسين',
    };
    return labels[tier] || tier;
  };

  const getAnomalyIcon = (severity: string) => {
    if (severity === 'critical') return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const _getAnomalyBadgeVariant = (severity: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (severity === 'critical') return 'destructive';
    if (severity === 'warning') return 'secondary';
    return 'outline';
  };

  const getRiskLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      low: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      high: 'text-orange-600 bg-orange-50',
      critical: 'text-red-600 bg-red-50',
    };
    return colors[level] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">لوحة التحكم الذكية</h2>
        <Badge variant="outline" className="mr-auto">AI-Powered</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Salary Forecast Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                    {salaryForecast.predicted_monthly_salary.toLocaleString()} ر.س
                  </div>
                  <div className="text-xs text-muted-foreground">الراتب المتوقع هذا الشهر</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted rounded p-2 text-center">
                    <div className="font-medium">{salaryForecast.projected_monthly_orders}</div>
                    <div className="text-muted-foreground">طلب متوقع</div>
                  </div>
                  <div className="bg-muted rounded p-2 text-center">
                    <div className="font-medium">{salaryForecast.current_daily_avg}</div>
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
                  متبقي {salaryForecast.days_remaining} يوم في الشهر
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                لا توجد بيانات للتحليل
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best Employees Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              أفضل الموظفين
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : bestEmployees.length > 0 ? (
              <div className="space-y-3">
                {bestEmployees.slice(0, 3).map((emp, idx) => (
                  <div key={emp.employee_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      idx === 0 ? "bg-yellow-100 text-yellow-700" :
                      idx === 1 ? "bg-gray-200 text-gray-700" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{emp.employee_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {emp.total_orders} طلب • {emp.attendance_rate}% حضور
                      </div>
                    </div>
                    <Badge className={cn("text-xs", getPerformanceColor(emp.performance_tier))}>
                      {emp.composite_score}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                لا توجد بيانات للتحليل
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anomaly Detection Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              الكشف عن الشذوذ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnomalies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : anomalies.length > 0 ? (
              <div className="space-y-4">
                {anomalyStats && (
                  <div className={cn("p-3 rounded-lg", getRiskLevelColor(anomalyStats.level))}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">مستوى الخطورة</span>
                      <Badge variant={anomalyStats.level === 'critical' ? 'destructive' : 'outline'}>
                        {anomalyStats.level === 'low' ? 'منخفض' :
                         anomalyStats.level === 'medium' ? 'متوسط' :
                         anomalyStats.level === 'high' ? 'مرتفع' : 'حرج'}
                      </Badge>
                    </div>
                    <Progress value={anomalyStats.risk_score} className="mt-2" />
                    <div className="text-xs mt-1">{anomalyStats.risk_score}/100</div>
                  </div>
                )}
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {anomalies.slice(0, 3).map((anomaly, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded border">
                      {getAnomalyIcon(anomaly.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">{anomaly.message}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {anomaly.recommendation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <div className="text-sm font-medium text-green-700">لا توجد شواذ</div>
                <div className="text-xs text-muted-foreground">جميع البيانات طبيعية</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            void loadSalaryForecast();
            void loadBestEmployees();
            if (employeeId) void loadAnomalies();
          }}
          disabled={loadingForecast || loadingEmployees || loadingAnomalies}
          className="gap-2"
        >
          {(loadingForecast || loadingEmployees || loadingAnomalies) && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          تحديث التحليل
        </Button>
      </div>
    </div>
  );
}

export default AIDashboard;
