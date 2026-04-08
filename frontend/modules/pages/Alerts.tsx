import { Bell } from 'lucide-react';

import AlertsList from '@shared/components/AlertsList';

const AlertsPage = () => {
  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bell className="text-primary" size={22} />
        </div>
        <div>
          <nav className="page-breadcrumb">
            <span>الموارد البشرية</span>
            <span className="page-breadcrumb-sep">/</span>
            <span className="text-foreground font-medium">التنبيهات</span>
          </nav>
          <h1 className="page-title">التنبيهات</h1>
          <p className="text-sm text-muted-foreground">
            متابعة التنبيهات العاجلة وحالات الاستحقاق التي تحتاج مراجعة.
          </p>
        </div>
      </div>

      <div className="max-w-5xl">
        <AlertsList />
      </div>
    </div>
  );
};

export default AlertsPage;
