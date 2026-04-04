import { Edit2, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import type { AppData } from '@modules/apps/types';
import { getWorkTypeLabel } from '@shared/lib/workType';

interface AppCardProps {
  app: AppData;
  selected: boolean;
  canEdit: boolean;
  onSelect: (app: AppData) => void;
  onEdit: (app: AppData) => void;
  onToggleActive: (app: AppData, event: React.MouseEvent) => void;
  onDelete: (app: AppData, event: React.MouseEvent) => void;
}

export const AppCard = ({
  app,
  selected,
  canEdit,
  onSelect,
  onEdit,
  onToggleActive,
  onDelete,
}: AppCardProps) => {
  const isActiveInMonth = app.is_active_this_month;

  return (
    <div
      onClick={() => isActiveInMonth && onSelect(app)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border text-center transition-all ${
        !isActiveInMonth
          ? 'border-white/20 opacity-50 grayscale hover:grayscale-0'
          : 'border-white/20 shadow-sm hover:scale-[1.01] hover:shadow-md'
      } ${selected ? 'ring-2 ring-primary border-primary' : ''}`}
      style={{ backgroundColor: app.brand_color, color: app.text_color }}
    >
      <div className="h-full p-5">
        {canEdit && (
          <div
            className="absolute left-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit(app);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black"
              title="تعديل"
              type="button"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(event) => onToggleActive(app, event)}
              className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                isActiveInMonth
                  ? 'bg-white/20 hover:bg-rose-500 hover:text-white'
                  : 'bg-white/20 hover:bg-emerald-500 hover:text-white'
              }`}
              title={isActiveInMonth ? 'تعطيل لهذا الشهر' : 'تفعيل لهذا الشهر'}
              type="button"
            >
              {isActiveInMonth ? <PowerOff size={12} /> : <Power size={12} />}
            </button>
            <button
              onClick={(event) => onDelete(app, event)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-rose-600 hover:text-white"
              title="أرشفة نهائية"
              type="button"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold shadow-sm">
          {app.name.charAt(0)}
        </div>

        <h3 className="truncate text-sm font-bold" style={{ color: app.text_color }}>
          {app.name}
        </h3>
        <div className="mt-1 flex justify-center">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: app.text_color }}
          >
            {getWorkTypeLabel(app.work_type)}
          </span>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: app.text_color, opacity: 0.8 }}>المناديب العاملين</span>
            <span className="font-bold" style={{ color: app.text_color }}>
              {app.employeeCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: app.text_color, opacity: 0.8 }}>إجمالي الطلبات</span>
            <span className="font-bold" style={{ color: app.text_color }}>
              {app.ordersCount.toLocaleString()}
            </span>
          </div>
        </div>

        {!isActiveInMonth && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <span className="rounded-lg border border-white/20 bg-black/50 px-2 py-1 text-[10px] font-bold text-white">
              غير مفعلة للشهر
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const AddAppCard = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="group flex min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-5 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
    type="button"
  >
    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
      <Plus size={20} className="text-muted-foreground group-hover:text-primary" />
    </div>
    <p className="text-xs font-medium text-muted-foreground group-hover:text-primary">إضافة منصة جديدة</p>
  </button>
);
