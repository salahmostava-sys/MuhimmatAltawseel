import type { ReactNode } from 'react';
import { Bot, Gauge, Settings2, Target, Trophy } from 'lucide-react';

import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { Switch } from '@shared/components/ui/switch';
import {
  getSystemPresetAdvancedConfig,
  SYSTEM_PRESET_LABELS,
  type AnalysisLevel,
  type MessageLength,
  type RankingMode,
  type SystemAdvancedConfig,
  type SystemPreset,
  type WeekStartsOn,
} from '@shared/lib/systemAdvancedConfig';

type DecisionSystemSettingsProps = {
  value: SystemAdvancedConfig;
  onChange: (next: SystemAdvancedConfig) => void;
  isRTL: boolean;
};

function SectionCard(props: Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}>) {
  const { icon, title, description, children } = props;

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function NumberField(props: Readonly<{
  label: string;
  value: number;
  onChange: (next: number) => void;
  suffix?: string;
  min?: number;
}>) {
  const { label, value, onChange, suffix, min = 0 } = props;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={min}
          value={value}
          onChange={(event) => onChange(Math.max(min, Number.parseFloat(event.target.value) || 0))}
          className="text-center"
        />
        {suffix ? <span className="text-xs text-muted-foreground shrink-0">{suffix}</span> : null}
      </div>
    </div>
  );
}

function TextField(props: Readonly<{
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}>) {
  const { label, value, onChange, placeholder } = props;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ToggleRow(props: Readonly<{
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}>) {
  const { label, hint, checked, onCheckedChange } = props;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SelectField<T extends string>(props: Readonly<{
  label: string;
  value: T;
  onValueChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}>) {
  const { label, value, onValueChange, options } = props;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function DecisionSystemSettings(props: Readonly<DecisionSystemSettingsProps>) {
  const { value, onChange, isRTL } = props;

  const update = <SectionKey extends keyof SystemAdvancedConfig>(
    section: SectionKey,
    nextValue: SystemAdvancedConfig[SectionKey],
  ) => {
    onChange({
      ...value,
      [section]: nextValue,
    });
  };

  const applyPreset = (preset: SystemPreset) => {
    const presetConfig = getSystemPresetAdvancedConfig(preset);
    onChange({
      ...presetConfig,
      telegram: {
        ...presetConfig.telegram,
        botToken: value.telegram.botToken,
        adminChatId: value.telegram.adminChatId,
      },
    });
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <SectionCard
        icon={<Settings2 size={18} />}
        title="قوالب جاهزة"
        description="اختر Preset مناسبًا لطبيعة شركتك ثم عدّل التفاصيل الدقيقة حسب الحاجة."
      >
        <div className="flex flex-wrap gap-2">
          {(['orders', 'attendance', 'hybrid'] as const).map((preset) => (
            <Button key={preset} type="button" variant="outline" onClick={() => applyPreset(preset)}>
              {SYSTEM_PRESET_LABELS[preset]}
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={<Target size={18} />}
        title="الإعدادات العامة والأهداف"
        description="خلّي العملة والمنطقة الزمنية والهدف اليومي/الشهري قابلة للتعديل من مكان واحد."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="العملة"
            value={value.general.currency}
            onChange={(next) => update('general', { ...value.general, currency: next })}
            placeholder="SAR"
          />
          <TextField
            label="المنطقة الزمنية"
            value={value.general.timezone}
            onChange={(next) => update('general', { ...value.general, timezone: next })}
            placeholder="Asia/Riyadh"
          />
          <SelectField<WeekStartsOn>
            label="بداية الأسبوع"
            value={value.general.weekStartsOn}
            onValueChange={(next) => update('general', { ...value.general, weekStartsOn: next })}
            options={[
              { value: 'saturday', label: 'السبت' },
              { value: 'sunday', label: 'الأحد' },
              { value: 'monday', label: 'الاثنين' },
            ]}
          />
          <SelectField<'global' | 'per_rider'>
            label="نمط الأهداف"
            value={value.targets.mode}
            onValueChange={(next) => update('targets', { ...value.targets, mode: next })}
            options={[
              { value: 'global', label: 'Global' },
              { value: 'per_rider', label: 'Per Rider' },
            ]}
          />
          <NumberField
            label="الهدف اليومي الافتراضي"
            value={value.targets.dailyOrders}
            onChange={(next) => update('targets', { ...value.targets, dailyOrders: next })}
            suffix="طلب"
          />
          <NumberField
            label="الهدف الشهري الافتراضي"
            value={value.targets.monthlyOrders}
            onChange={(next) => update('targets', { ...value.targets, monthlyOrders: next })}
            suffix="طلب"
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Gauge size={18} />}
        title="إعدادات الرواتب والتنبيهات"
        description="كل القيم الأساسية التي تؤثر على القرارات والمكافآت والتنبيهات التشغيلية."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField
            label="سعر الطلب الافتراضي"
            value={value.salary.ordersRate}
            onChange={(next) => update('salary', { ...value.salary, ordersRate: next })}
            suffix="ر.س"
          />
          <NumberField
            label="راتب الحضور الثابت"
            value={value.salary.attendanceFixedSalary}
            onChange={(next) => update('salary', { ...value.salary, attendanceFixedSalary: next })}
            suffix="ر.س"
          />
          <NumberField
            label="راتب Hybrid الأساسي"
            value={value.salary.hybridBaseSalary}
            onChange={(next) => update('salary', { ...value.salary, hybridBaseSalary: next })}
            suffix="ر.س"
          />
          <NumberField
            label="سعر الطلب لـ Hybrid"
            value={value.salary.hybridOrderRate}
            onChange={(next) => update('salary', { ...value.salary, hybridOrderRate: next })}
            suffix="ر.س"
          />
          <NumberField
            label="Default Bonus"
            value={value.salary.defaultBonus}
            onChange={(next) => update('salary', { ...value.salary, defaultBonus: next })}
            suffix="ر.س"
          />
          <NumberField
            label="Default Deductions"
            value={value.salary.defaultDeductions}
            onChange={(next) => update('salary', { ...value.salary, defaultDeductions: next })}
            suffix="ر.س"
          />
          <NumberField
            label="حد الأداء المنخفض"
            value={value.alerts.lowPerformanceThreshold}
            onChange={(next) => update('alerts', { ...value.alerts, lowPerformanceThreshold: next })}
            suffix="/100"
          />
          <NumberField
            label="حد أيام الغياب"
            value={value.alerts.absenceDaysThreshold}
            onChange={(next) => update('alerts', { ...value.alerts, absenceDaysThreshold: next })}
            suffix="يوم"
          />
          <NumberField
            label="الحد الأدنى للطلبات/يوم"
            value={value.alerts.minimumOrdersPerDay}
            onChange={(next) => update('alerts', { ...value.alerts, minimumOrdersPerDay: next })}
            suffix="طلب"
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Bot size={18} />}
        title="AI و Telegram"
        description="إعدادات التحليل الذكي وطول الرسائل وقنوات الإرسال المؤتمتة."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField<AnalysisLevel>
            label="مستوى التحليل"
            value={value.ai.analysisLevel}
            onValueChange={(next) => update('ai', { ...value.ai, analysisLevel: next })}
            options={[
              { value: 'simple', label: 'Simple' },
              { value: 'advanced', label: 'Advanced' },
            ]}
          />
          <SelectField<MessageLength>
            label="طول الرسائل"
            value={value.ai.messageLength}
            onValueChange={(next) => update('ai', { ...value.ai, messageLength: next })}
            options={[
              { value: 'short', label: 'قصير' },
              { value: 'medium', label: 'متوسط' },
              { value: 'long', label: 'طويل' },
            ]}
          />
          <SelectField<RankingMode>
            label="أسلوب التقييم"
            value={value.ranking.scoringMode}
            onValueChange={(next) => update('ranking', { ...value.ranking, scoringMode: next })}
            options={[
              { value: 'orders', label: 'Orders' },
              { value: 'attendance', label: 'Attendance' },
              { value: 'hybrid', label: 'Hybrid' },
            ]}
          />
          <TextField
            label="Telegram Bot Token"
            value={value.telegram.botToken}
            onChange={(next) => update('telegram', { ...value.telegram, botToken: next })}
            placeholder="123456:ABC..."
          />
          <TextField
            label="Admin Chat ID"
            value={value.telegram.adminChatId}
            onChange={(next) => update('telegram', { ...value.telegram, adminChatId: next })}
            placeholder="-100..."
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="عدد الـ Top"
              value={value.ranking.topPerformersCount}
              onChange={(next) => update('ranking', { ...value.ranking, topPerformersCount: next })}
              min={1}
            />
            <NumberField
              label="عدد الـ Worst"
              value={value.ranking.worstPerformersCount}
              onChange={(next) => update('ranking', { ...value.ranking, worstPerformersCount: next })}
              min={1}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="تشغيل AI Insights"
            hint="يعرض القرارات والملخصات الذكية داخل الداشبورد."
            checked={value.ai.enabled}
            onCheckedChange={(next) => update('ai', { ...value.ai, enabled: next })}
          />
          <ToggleRow
            label="تشغيل AI Chat"
            hint="يسمح بالأسئلة المباشرة مثل: مين أسوأ 5 الشهر ده؟"
            checked={value.ai.chatEnabled}
            onCheckedChange={(next) => update('ai', { ...value.ai, chatEnabled: next })}
          />
          <ToggleRow
            label="Daily Report"
            hint="يرسل التقرير اليومي إذا كانت الأتمتة مفعلة."
            checked={value.telegram.dailyReportEnabled}
            onCheckedChange={(next) => update('telegram', { ...value.telegram, dailyReportEnabled: next })}
          />
          <ToggleRow
            label="Alerts على Telegram"
            hint="إرسال تنبيهات الأداء والغياب تلقائيًا."
            checked={value.telegram.alertsEnabled}
            onCheckedChange={(next) => update('telegram', { ...value.telegram, alertsEnabled: next })}
          />
          <ToggleRow
            label="رسائل المناديب"
            hint="رسائل فردية للتحفيز أو المتابعة."
            checked={value.telegram.riderMessagesEnabled}
            onCheckedChange={(next) => update('telegram', { ...value.telegram, riderMessagesEnabled: next })}
          />
          <ToggleRow
            label="Weekly Reports"
            hint="تشغيل التقارير الأسبوعية والجوائز الدورية."
            checked={value.automation.weeklyReports}
            onCheckedChange={(next) => update('automation', { ...value.automation, weeklyReports: next })}
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Trophy size={18} />}
        title="الداشبورد، الترتيب والاستيراد"
        description="تحكم في أجزاء العرض، قرارات النظام، والـ import الاحترافي."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="إظهار Smart Decisions"
            hint="القرارات التي تقول لك تعمل إيه بناءً على القواعد الحالية."
            checked={value.dashboard.showSmartDecisions}
            onCheckedChange={(next) => update('dashboard', { ...value.dashboard, showSmartDecisions: next })}
          />
          <ToggleRow
            label="إظهار Charts"
            hint="إظهار التحليلات البصرية في الداشبورد."
            checked={value.dashboard.showCharts}
            onCheckedChange={(next) => update('dashboard', { ...value.dashboard, showCharts: next })}
          />
          <ToggleRow
            label="إظهار Ranking"
            hint="إظهار التصنيفات والجوائز."
            checked={value.dashboard.showRanking}
            onCheckedChange={(next) => update('dashboard', { ...value.dashboard, showRanking: next })}
          />
          <ToggleRow
            label="Strict Validation"
            hint="منع إدخال ملفات بها صفوف غير سليمة."
            checked={value.import.strictValidation}
            onCheckedChange={(next) => update('import', { ...value.import, strictValidation: next })}
          />
          <ToggleRow
            label="Preview قبل الحفظ"
            hint="يعرض المعاينة قبل اعتماد أي import."
            checked={value.import.previewBeforeSave}
            onCheckedChange={(next) => update('import', { ...value.import, previewBeforeSave: next })}
          />
          <ToggleRow
            label="Daily Reports Automation"
            hint="يفعل التشغيل الآلي للتقارير اليومية."
            checked={value.automation.dailyReports}
            onCheckedChange={(next) => update('automation', { ...value.automation, dailyReports: next })}
          />
          <ToggleRow
            label="Alerts Automation"
            hint="يفعل التنبيهات الآلية عند تجاوز الحدود."
            checked={value.automation.alerts}
            onCheckedChange={(next) => update('automation', { ...value.automation, alerts: next })}
          />
          <ToggleRow
            label="إظهار AI Summary"
            hint="إظهار البطاقات الذكية حتى عند عدم فتح الشات."
            checked={value.dashboard.showAIInsights}
            onCheckedChange={(next) => update('dashboard', { ...value.dashboard, showAIInsights: next })}
          />
        </div>
      </SectionCard>
    </div>
  );
}
