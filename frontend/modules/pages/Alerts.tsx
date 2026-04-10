import { Bell, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';

export default function AlertsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">التنبيهات</h1>
        <p className="text-muted-foreground">إدارة التنبيهات والإشعارات</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell size={20} />
            التنبيهات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info size={48} className="text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">لا توجد تنبيهات</h3>
            <p className="text-sm text-muted-foreground mt-1">
              ستظهر التنبيهات المهمة هنا عندما تكون متاحة
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}