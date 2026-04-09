import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { appService } from '@services/appService';
import { AppWorkTypeSettings } from '@modules/settings/components/AppWorkTypeSettings';
import type { WorkType } from '@shared/types/shifts';

export function AppSettingsPage() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const queryClient = useQueryClient();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['apps', 'all', uid],
    queryFn: () => appService.getAll(),
    enabled,
  });

  const selectedApp = apps.find((a) => a.id === selectedAppId);

  const handleWorkTypeChange = async (workType: WorkType) => {
    if (!selectedApp) return;
    
    await appService.update(selectedApp.id, {
      ...selectedApp,
      work_type: workType,
    });
    
    await queryClient.invalidateQueries({ queryKey: ['apps'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin size-8 text-muted-foreground" />
      </div>
    );
  }

  if (selectedApp) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedAppId(null)}
          className="gap-2"
        >
          <ArrowRight size={16} />
          العودة للقائمة
        </Button>
        <AppWorkTypeSettings
          appId={selectedApp.id}
          appName={selectedApp.name}
          currentWorkType={selectedApp.work_type || 'orders'}
          onWorkTypeChange={handleWorkTypeChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">إعدادات المنصات</h2>
        <p className="text-sm text-muted-foreground">
          حدد نوع العمل لكل منصة (طلبات، دوام، أو مختلط)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <button
            key={app.id}
            onClick={() => setSelectedAppId(app.id)}
            className="flex items-center gap-4 rounded-lg border p-4 text-right transition-colors hover:bg-muted/50"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold"
              style={{ backgroundColor: app.brand_color, color: app.text_color }}
            >
              {app.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{app.name}</h3>
              <p className="text-xs text-muted-foreground">
                {app.work_type === 'orders' && '📦 طلبات'}
                {app.work_type === 'shift' && '⏰ دوام'}
                {app.work_type === 'hybrid' && '🔄 مختلط'}
                {!app.work_type && '📦 طلبات (افتراضي)'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
