import { Link } from 'react-router-dom';
import { Plus, Clock, Wallet, Wrench, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@shared/lib/utils';

export type QuickAction = {
  id: string;
  label: string;
  to: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
};

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'add-order',
    label: 'إضافة طلب',
    to: '/orders',
    icon: <Package size={18} />,
    color: 'bg-blue-500/10 text-blue-600',
    hoverColor: 'hover:bg-blue-500/20',
  },
  {
    id: 'record-attendance',
    label: 'تسجيل حضور',
    to: '/attendance',
    icon: <Clock size={18} />,
    color: 'bg-emerald-500/10 text-emerald-600',
    hoverColor: 'hover:bg-emerald-500/20',
  },
  {
    id: 'request-advance',
    label: 'طلب سلفة',
    to: '/advances',
    icon: <Wallet size={18} />,
    color: 'bg-amber-500/10 text-amber-600',
    hoverColor: 'hover:bg-amber-500/20',
  },
  {
    id: 'add-maintenance',
    label: 'صيانة',
    to: '/maintenance',
    icon: <Wrench size={18} />,
    color: 'bg-purple-500/10 text-purple-600',
    hoverColor: 'hover:bg-purple-500/20',
  },
  {
    id: 'add-fuel',
    label: 'وقود',
    to: '/fuel',
    icon: <Plus size={18} />,
    color: 'bg-rose-500/10 text-rose-600',
    hoverColor: 'hover:bg-rose-500/20',
  },
  {
    id: 'view-alerts',
    label: 'التنبيهات',
    to: '/alerts',
    icon: <AlertTriangle size={18} />,
    color: 'bg-orange-500/10 text-orange-600',
    hoverColor: 'hover:bg-orange-500/20',
  },
];

type QuickActionsProps = {
  actions?: QuickAction[];
  className?: string;
};

export function QuickActions({ actions = DEFAULT_QUICK_ACTIONS, className }: QuickActionsProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3", className)}>
      {actions.map((action) => (
        <Link
          key={action.id}
          to={action.to}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 shadow-sm transition-all duration-200",
            action.color,
            action.hoverColor,
            "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          <div className="p-2 rounded-lg bg-card/50">
            {action.icon}
          </div>
          <span className="text-xs font-semibold text-center">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
