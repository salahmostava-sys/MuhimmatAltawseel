import { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { Badge } from '@shared/components/ui/badge';
import type { UnmatchedEmployeeName } from '@shared/lib/nameMatching';

type Props = Readonly<{
  open: boolean;
  unmatched: UnmatchedEmployeeName[];
  onConfirm: (mapping: Map<string, string>) => void;
  onCancel: () => void;
}>;

export function NameMappingDialog({ open, unmatched, onConfirm, onCancel }: Props) {
  const [mapping, setMapping] = useState<Map<string, string>>(new Map());

  const handleSelectEmployee = (importedName: string, employeeId: string) => {
    setMapping((prev) => {
      const next = new Map(prev);
      if (employeeId === 'skip') {
        next.delete(importedName);
      } else {
        next.set(importedName, employeeId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(mapping);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'bg-green-500';
    if (similarity >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-warning" size={20} />
            مطابقة الأسماء غير الدقيقة
          </DialogTitle>
          <DialogDescription>
            تم العثور على {unmatched.length} اسم غير مطابق تماماً. اختر الموظف الصحيح لكل اسم أو تخطَّه.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {unmatched.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">الاسم في الملف:</p>
                    <p className="text-base font-bold text-destructive">{item.name}</p>
                  </div>
                  {mapping.has(item.name) ? (
                    <Badge variant="outline" className="gap-1">
                      <Check size={12} className="text-green-600" />
                      تم المطابقة
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <X size={12} className="text-red-600" />
                      غير مطابق
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">اختر الموظف الصحيح:</p>
                  <Select
                    value={mapping.get(item.name) || 'skip'}
                    onValueChange={(value) => handleSelectEmployee(item.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر موظف أو تخطَّ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">
                        <span className="text-muted-foreground">⏭️ تخطي هذا الاسم</span>
                      </SelectItem>
                      {item.suggestions.length > 0 ? (
                        item.suggestions.map((suggestion) => (
                          <SelectItem key={suggestion.id} value={suggestion.id}>
                            <div className="flex items-center gap-2 w-full">
                              <span>{suggestion.name}</span>
                              <div className="flex items-center gap-1 mr-auto">
                                <div
                                  className={`h-2 w-2 rounded-full ${getSimilarityColor(suggestion.similarity)}`}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(suggestion.similarity)}%
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-suggestions" disabled>
                          <span className="text-muted-foreground">لا توجد اقتراحات</span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {item.suggestions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    💡 الاقتراحات مرتبة حسب نسبة التشابه
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء الاستيراد
          </Button>
          <Button onClick={handleConfirm}>
            متابعة ({mapping.size} مطابقة، {unmatched.length - mapping.size} متخطى)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
