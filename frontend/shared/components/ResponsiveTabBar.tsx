import type { ReactNode } from 'react';
import { TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { cn } from '@shared/lib/utils';

export type ResponsiveTabOption = {
  value: string;
  /** محتوى أزرار التبويب على الشاشات المتوسطة والكبيرة */
  label: ReactNode;
  /** نص قائمة الجوال (نص عادي؛ يُفضَّل عندما يحتوي label على أيقونات) */
  selectLabel: string;
};

type ResponsiveTabBarProps = Readonly<{
  value: string;
  onValueChange: (value: string) => void;
  options: ResponsiveTabOption[];
  tabsListClassName?: string;
  selectClassName?: string;
  selectAriaLabel?: string;
}>;

/**
 * أزرار تبويب على md+، وقائمة منسدلة على الشاشات الصغيرة (نفس الحالة المرتبطة بـ Tabs).
 */
export function ResponsiveTabBar({
  value,
  onValueChange,
  options,
  tabsListClassName,
  selectClassName,
  selectAriaLabel = 'اختر القسم',
}: ResponsiveTabBarProps) {
  return (
    <>
      <TabsList className={cn('hidden md:flex flex-shrink-0', tabsListClassName)}>
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="md:hidden w-full">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className={cn('h-10 w-full text-start font-semibold', selectClassName)} aria-label={selectAriaLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.selectLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
