import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@shared/components/ui/radio-group';
import type { App } from '@modules/orders/types';

type Props = Readonly<{
  open: boolean;
  apps: App[];
  onConfirm: (appId: string | undefined) => void;
  onCancel: () => void;
}>;

export function ImportPlatformDialog({ open, apps, onConfirm, onCancel }: Props) {
  const [selectedApp, setSelectedApp] = useState<string>('all');

  const handleConfirm = () => {
    onConfirm(selectedApp === 'all' ? undefined : selectedApp);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>اختر المنصة المستهدفة</DialogTitle>
          <DialogDescription>
            حدد المنصة التي سيتم رفع الطلبات عليها. اختر "جميع المنصات" لتوزيع الطلبات على كل المنصات المفعلة للموظف.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedApp} onValueChange={setSelectedApp}>
            <div className="flex items-center space-x-2 space-x-reverse mb-3">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="cursor-pointer font-medium">
                جميع المنصات (السلوك القديم)
              </Label>
            </div>
            {apps.map((app) => (
              <div key={app.id} className="flex items-center space-x-2 space-x-reverse mb-2">
                <RadioGroupItem value={app.id} id={app.id} />
                <Label htmlFor={app.id} className="cursor-pointer flex items-center gap-2">
                  {app.logo_url && (
                    <img src={app.logo_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                  )}
                  {app.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button onClick={handleConfirm}>
            متابعة الاستيراد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
