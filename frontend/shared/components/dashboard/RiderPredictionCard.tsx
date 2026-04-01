import type { RiderPrediction } from '@services/predictionService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  prediction: RiderPrediction;
  rank?: number;
}

export function RiderPredictionCard({ prediction: p, rank }: Props) {
  const borderColor =
    p.trend === 'up' ? 'border-green-400' : p.trend === 'down' ? 'border-red-400' : 'border-gray-300';

  const TrendIcon = p.trend === 'up' ? TrendingUp : p.trend === 'down' ? TrendingDown : Minus;

  const trendColor =
    p.trend === 'up' ? 'text-green-600' : p.trend === 'down' ? 'text-red-500' : 'text-gray-500';

  const confidenceBadge =
    p.confidence === 'high' ? '🟢 عالية' : p.confidence === 'medium' ? '🟡 متوسطة' : '🔴 منخفضة';

  const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div className={`border-2 ${borderColor} rounded-xl p-4 bg-card shadow-sm`} dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {rankBadge && <span className="text-xl">{rankBadge}</span>}
          <span className="font-semibold text-sm">{p.riderName}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          {p.trendPercent > 0 ? '+' : ''}
          {p.trendPercent}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-center">
        <div className="bg-muted rounded-lg p-2">
          <div className="text-xs text-muted-foreground">المنجز</div>
          <div className="font-bold text-lg">{p.ordersThisMonthSoFar}</div>
        </div>
        <div className="bg-primary/10 rounded-lg p-2">
          <div className="text-xs text-muted-foreground">المتوقع</div>
          <div className="font-bold text-lg text-primary">{p.predictedTotal}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>التقدم</span>
          <span>{p.progressPercent}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${p.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>معدل آخر 14 يوم</span>
          <span className="font-medium">{p.dailyAvgLast14} طلب/يوم</span>
        </div>
        <div className="flex justify-between">
          <span>مقارنة بالشهر الماضي</span>
          <span
            className={
              p.vsLastMonth >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'
            }
          >
            {p.vsLastMonth >= 0 ? '+' : ''}
            {p.vsLastMonth} ({p.vsLastMonthPercent}%)
          </span>
        </div>
        <div className="flex justify-between">
          <span>ثقة التنبؤ</span>
          <span>{confidenceBadge}</span>
        </div>
      </div>
    </div>
  );
}
