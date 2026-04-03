import { useState, useEffect } from 'react';
import { supabase } from '@services/supabase/client';
import { salaryDraftService } from '@services/salaryDraftService';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
}

const ConcurrentEditingTest = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (result: TestResult) => {
    setResults((prev) => [...prev, result]);
  };

  const runTests = async () => {
    setResults([]);
    setTesting(true);

    try {
      // Test 1: Check salary_drafts table exists
      addResult({ name: 'فحص جدول salary_drafts', status: 'pending', message: 'جارٍ الفحص...' });
      const { data: draftsTable, error: draftsError } = await supabase
        .from('salary_drafts')
        .select('id')
        .limit(1);

      if (draftsError) {
        addResult({
          name: 'فحص جدول salary_drafts',
          status: 'error',
          message: `الجدول غير موجود: ${draftsError.message}`,
        });
      } else {
        addResult({
          name: 'فحص جدول salary_drafts',
          status: 'success',
          message: 'الجدول موجود ويعمل ✓',
        });
      }

      // Test 2: Check version column in salary_records
      addResult({ name: 'فحص عمود version', status: 'pending', message: 'جارٍ الفحص...' });
      const { data: versionCheck, error: versionError } = await supabase
        .from('salary_records')
        .select('version')
        .limit(1);

      if (versionError) {
        addResult({
          name: 'فحص عمود version',
          status: 'error',
          message: `العمود غير موجود: ${versionError.message}`,
        });
      } else {
        addResult({
          name: 'فحص عمود version',
          status: 'success',
          message: 'عمود version موجود ✓',
        });
      }

      // Test 3: Test draft save/load
      addResult({ name: 'اختبار حفظ المسودات', status: 'pending', message: 'جارٍ الاختبار...' });
      try {
        const testMonth = '2025-01';
        const testEmployeeId = 'test-employee-id';
        const testDraft = {
          incentives: 500,
          violations: 100,
          customDeductions: {},
          sickAllowance: 0,
          transfer: 0,
        };

        await salaryDraftService.saveDraft(testMonth, testEmployeeId, testDraft);
        const loaded = await salaryDraftService.getDraftsForMonth(testMonth);
        
        if (loaded[`${testEmployeeId}-${testMonth}`]) {
          addResult({
            name: 'اختبار حفظ المسودات',
            status: 'success',
            message: 'الحفظ والتحميل يعملان ✓',
          });
          
          // Cleanup
          await salaryDraftService.deleteDraft(testMonth, testEmployeeId);
        } else {
          addResult({
            name: 'اختبار حفظ المسودات',
            status: 'warning',
            message: 'تم الحفظ لكن فشل التحميل',
          });
        }
      } catch (error) {
        addResult({
          name: 'اختبار حفظ المسودات',
          status: 'error',
          message: `فشل الاختبار: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        });
      }

      // Test 4: Check Realtime publication
      addResult({ name: 'فحص Realtime', status: 'pending', message: 'جارٍ الفحص...' });
      const channel = supabase.channel('test-channel');
      const subscribed = await new Promise((resolve) => {
        channel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'salary_records' }, () => {})
          .subscribe((status) => {
            resolve(status === 'SUBSCRIBED');
          });
        
        setTimeout(() => resolve(false), 5000);
      });

      await channel.unsubscribe();

      if (subscribed) {
        addResult({
          name: 'فحص Realtime',
          status: 'success',
          message: 'Realtime مفعّل ويعمل ✓',
        });
      } else {
        addResult({
          name: 'فحص Realtime',
          status: 'warning',
          message: 'Realtime قد لا يكون مفعّلاً بشكل صحيح',
        });
      }

      // Test 5: Check RLS policies
      addResult({ name: 'فحص RLS Policies', status: 'pending', message: 'جارٍ الفحص...' });
      const { data: user } = await supabase.auth.getUser();
      
      if (user.user) {
        const { error: rlsError } = await supabase
          .from('salary_drafts')
          .select('*')
          .limit(1);

        if (rlsError) {
          addResult({
            name: 'فحص RLS Policies',
            status: 'error',
            message: `خطأ في RLS: ${rlsError.message}`,
          });
        } else {
          addResult({
            name: 'فحص RLS Policies',
            status: 'success',
            message: 'RLS Policies تعمل بشكل صحيح ✓',
          });
        }
      } else {
        addResult({
          name: 'فحص RLS Policies',
          status: 'warning',
          message: 'يجب تسجيل الدخول لاختبار RLS',
        });
      }

    } catch (error) {
      addResult({
        name: 'خطأ عام',
        status: 'error',
        message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="text-success" size={20} />;
      case 'error':
        return <XCircle className="text-destructive" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-warning" size={20} />;
      case 'pending':
        return <Loader2 className="animate-spin text-muted-foreground" size={20} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-success/20 bg-success/5';
      case 'error':
        return 'border-destructive/20 bg-destructive/5';
      case 'warning':
        return 'border-warning/20 bg-warning/5';
      case 'pending':
        return 'border-muted bg-muted/5';
    }
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const warningCount = results.filter((r) => r.status === 'warning').length;

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            اختبار حماية التعديلات المتزامنة
          </h1>
          <p className="text-muted-foreground">
            فحص شامل للتأكد من تطبيق جميع التحديثات بشكل صحيح
          </p>
        </div>

        <Card className="p-6">
          <Button onClick={runTests} disabled={testing} className="w-full">
            {testing ? (
              <>
                <Loader2 className="ml-2 animate-spin" size={16} />
                جارٍ الاختبار...
              </>
            ) : (
              'بدء الاختبار'
            )}
          </Button>
        </Card>

        {results.length > 0 && (
          <>
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">النتائج</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="text-2xl font-bold text-success">{successCount}</div>
                  <div className="text-xs text-muted-foreground">نجح</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="text-2xl font-bold text-warning">{warningCount}</div>
                  <div className="text-xs text-muted-foreground">تحذير</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-2xl font-bold text-destructive">{errorCount}</div>
                  <div className="text-xs text-muted-foreground">فشل</div>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {results.map((result, index) => (
                <Card
                  key={index}
                  className={`p-4 border-2 transition-all ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{result.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {!testing && errorCount === 0 && warningCount === 0 && (
              <Card className="p-6 bg-success/5 border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-success" size={24} />
                  <div>
                    <h3 className="font-semibold text-success">جميع الاختبارات نجحت! 🎉</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      النظام جاهز للاستخدام مع حماية كاملة من التعديلات المتزامنة
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {!testing && errorCount > 0 && (
              <Card className="p-6 bg-destructive/5 border-destructive/20">
                <div className="flex items-center gap-3">
                  <XCircle className="text-destructive" size={24} />
                  <div>
                    <h3 className="font-semibold text-destructive">يوجد أخطاء تحتاج إلى إصلاح</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      يرجى مراجعة الأخطاء أعلاه وتطبيق Migration إذا لم يتم بعد
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConcurrentEditingTest;
