import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Label } from '@shared/components/ui/label';
import { Input } from '@shared/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@shared/components/ui/radio-group';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/card';
import { toast } from '@shared/components/ui/sonner';
import { hybridRuleService } from '@services/hybridRuleService';
import type { WorkType, AppHybridRule } from '@shared/types/shifts';

type Props = {
  appId: string;
  appName: string;
  currentWorkType: WorkType;
  onWorkTypeChange: (workType: WorkType) => Promise<void>;
};

export function AppWorkTypeSettings({ appId, appName, currentWorkType, onWorkTypeChange }: Props) {
  const [workType, setWorkType] = useState<WorkType>(currentWorkType);
  const [hybridRule, setHybridRule] = useState<Partial<AppHybridRule>>({
    min_hours_for_shift: 11,
    shift_rate: 150,
    fallback_to_orders: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWorkType(currentWorkType);
    if (currentWorkType === 'hybrid') {
      void loadHybridRule();
    }
  }, [currentWorkType, appId]);

  const loadHybridRule = async () => {
    setLoading(true);
    try {
      const rule = await hybridRuleService.getByAppId(appId);
      if (rule) {
        setHybridRule(rule);
      }
    } catch (error) {
      console.error('Failed to load hybrid rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onWorkTypeChange(workType);

      if (workType === 'hybrid') {
        await hybridRuleService.upsert({
          app_id: appId,
          min_hours_for_shift: hybridRule.min_hours_for_shift || 11,
          shift_rate: hybridRule.shift_rate || 150,
          fallback_to_orders: hybridRule.fallback_to_orders ?? true,
        });
      } else {
        try {
          await hybridRuleService.delete(appId);
        } catch {
          // ignore
        }
      }

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل حفظ الإعدادات';
      toast.error('خطأ', { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات نوع العمل - {appName}</CardTitle>
        <CardDescription>
          حدد كيفية حساب رواتب الموظفين على هذه المنصة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>نوع العمل</Label>
          <RadioGroup value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="orders" id="orders" />
              <Label htmlFor="orders" className="cursor-pointer font-normal">
                <div>
                  <div className="font-medium">طلبات فقط</div>
                  <div className="text-xs text-muted-foreground">
                    يتم حساب الراتب بناءً على عدد الطلبات المنجزة
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="shift" id="shift" />
              <Label htmlFor="shift" className="cursor-pointer font-normal">
                <div>
                  <div className="font-medium">دوام فقط</div>
                  <div className="text-xs text-muted-foreground">
                    يتم حساب الراتب بناءً على عدد أيام الدوام وساعات العمل
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="hybrid" id="hybrid" />
              <Label htmlFor="hybrid" className="cursor-pointer font-normal">
                <div>
                  <div className="font-medium">مختلط (دوام أو طلبات)</div>
                  <div className="text-xs text-muted-foreground">
                    يتم الحساب بناءً على تحقيق شروط الدوام، وإلا يتم الحساب بالطلبات
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {workType === 'hybrid' && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">إعدادات الدوام المختلط</h4>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin size-4" />
                جاري التحميل...
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minHours">الحد الأدنى للساعات (دوام)</Label>
                    <Input
                      id="minHours"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={hybridRule.min_hours_for_shift || ''}
                      onChange={(e) =>
                        setHybridRule({ ...hybridRule, min_hours_for_shift: parseFloat(e.target.value) })
                      }
                      placeholder="11"
                    />
                    <p className="text-xs text-muted-foreground">
                      عدد الساعات المطلوبة لاحتساب اليوم كدوام
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shiftRate">سعر الدوام اليومي (ريال)</Label>
                    <Input
                      id="shiftRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={hybridRule.shift_rate || ''}
                      onChange={(e) =>
                        setHybridRule({ ...hybridRule, shift_rate: parseFloat(e.target.value) })
                      }
                      placeholder="150"
                    />
                    <p className="text-xs text-muted-foreground">
                      المبلغ المدفوع عند تحقيق ساعات الدوام
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="fallback"
                    checked={hybridRule.fallback_to_orders ?? true}
                    onCheckedChange={(checked) =>
                      setHybridRule({ ...hybridRule, fallback_to_orders: checked as boolean })
                    }
                  />
                  <Label htmlFor="fallback" className="cursor-pointer font-normal text-sm">
                    التحويل لحساب الطلبات عند عدم تحقيق الساعات المطلوبة
                  </Label>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin size-4 ml-2" />}
            حفظ الإعدادات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
