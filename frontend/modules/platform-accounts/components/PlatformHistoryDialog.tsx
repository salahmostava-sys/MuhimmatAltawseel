import { History, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import type {
  AssignmentHistoryGroup,
  PlatformAccountView,
} from '@modules/platform-accounts/types';

interface PlatformHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyAccount: PlatformAccountView | null;
  historyLoading: boolean;
  historyGroups: AssignmentHistoryGroup[];
}

export const PlatformHistoryDialog = ({
  open,
  onOpenChange,
  historyAccount,
  historyLoading,
  historyGroups,
}: PlatformHistoryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={16} />
            السجل التاريخي - {historyAccount?.account_username}
            <span className="text-sm text-muted-foreground font-normal">
              ({historyAccount?.app_name ?? '-'})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : historyGroups.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <History size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا يوجد سجل تعيينات بعد</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyGroups.map((group) => (
                <div key={group.month} className="space-y-2">
                  <p className="text-xs font-bold text-foreground border-b border-border pb-1">
                    شهر {group.month} - {group.count} تعيين
                    {group.hasMultipleAssignments && (
                      <span className="font-normal text-muted-foreground ms-2">
                        (تعاقب عدة مناديب على نفس الحساب)
                      </span>
                    )}
                  </p>

                  {group.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        !assignment.end_date
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      <div
                        className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          !assignment.end_date ? 'bg-success' : 'bg-muted-foreground/40'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {assignment.employee_name}
                          </span>
                          {!assignment.end_date && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                              شاغل حاليًا
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          من:
                          <span className="font-medium text-foreground ms-1">
                            {assignment.start_date}
                          </span>
                          {assignment.end_date && (
                            <>
                              {' '}
                              إلى:
                              <span className="font-medium text-foreground ms-1">
                                {assignment.end_date}
                              </span>
                            </>
                          )}
                        </p>
                        {assignment.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">
                            {assignment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
