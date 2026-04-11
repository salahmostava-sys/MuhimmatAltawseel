import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import type { TransactionType, CreateTransactionInput } from '@services/financeService';

const REVENUE_CATEGORIES = [
  'إيرادات توصيل',
  'إيرادات منصات',
  'عقود شركات',
  'إيرادات أخرى',
];

const EXPENSE_CATEGORIES = [
  'رواتب',
  'إيجار',
  'وقود',
  'صيانة مركبات',
  'تأمين',
  'اتصالات',
  'مستلزمات',
  'مصاريف إدارية',
  'مصاريف أخرى',
];

export function AddTransactionModal(props: Readonly<{
  defaultType: TransactionType;
  monthYear: string;
  saving: boolean;
  onSave: (input: CreateTransactionInput) => Promise<void>;
  onClose: () => void;
}>) {
  const { defaultType, monthYear, saving, onSave, onClose } = props;

  const [type, setType] = useState<TransactionType>(defaultType);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today.startsWith(monthYear) ? today : `${monthYear}-01`;
  });
  const [notes, setNotes] = useState('');

  const categories = type === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async () => {
    if (!category || !amount || Number(amount) <= 0) return;
    await onSave({
      type,
      category,
      description: description || undefined,
      amount: Number(amount),
      month_year: monthYear,
      date,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">
            {type === 'revenue' ? '➕ إضافة إيراد' : '➕ إضافة مصروف'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl bg-muted p-1 gap-1">
            <button
              type="button"
              onClick={() => { setType('revenue'); setCategory(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                type === 'revenue'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              💰 إيراد
            </button>
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              💸 مصروف
            </button>
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm mb-1.5 block">التصنيف <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10"><SelectValue placeholder="اختر التصنيف..." /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-sm mb-1.5 block">المبلغ (ر.س) <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 text-lg font-bold"
              dir="ltr"
            />
          </div>

          {/* Date */}
          <div>
            <Label className="text-sm mb-1.5 block">التاريخ</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10"
              dir="ltr"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm mb-1.5 block">الوصف</Label>
            <Input
              placeholder="وصف مختصر..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm mb-1.5 block">ملاحظات</Label>
            <Input
              placeholder="ملاحظات إضافية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-2">
          <Button onClick={handleSubmit} disabled={saving || !category || !amount} className="flex-1 gap-1.5">
            {saving ? 'جاري الحفظ...' : <><Plus size={15} /> حفظ</>}
          </Button>
          <Button variant="outline" onClick={onClose} className="px-6">إلغاء</Button>
        </div>
      </div>
    </div>
  );
}
