import { useEffect, useState, forwardRef } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Input } from '@shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover';
import { normalizeArabicDigits } from '@shared/lib/formatters';

const InlineEditTrigger = forwardRef<HTMLButtonElement, Readonly<{
  children: React.ReactNode;
  saving?: boolean;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}>>((props, ref) => {
  const { children, saving = false, title = 'اضغط للتعديل', onClick, ...rest } = props;

  return (
    <button
      ref={ref}
      type="button"
      title={title}
      className="group flex h-full w-full min-h-[32px] items-center justify-center gap-1.5 rounded-sm px-2 py-1 transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-text"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <div className="min-w-0 flex-1 flex items-center justify-center pointer-events-none">{children}</div>
      {saving ? (
        <Loader2 size={12} className="animate-spin text-muted-foreground shrink-0" />
      ) : (
        <Pencil size={12} className="shrink-0 text-muted-foreground/0 transition-opacity group-hover:text-muted-foreground/60" />
      )}
    </button>
  );
});
InlineEditTrigger.displayName = 'InlineEditTrigger';

export type InlineSelectEditorProps = Readonly<{
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => Promise<void>;
  renderDisplay: () => React.ReactNode;
}>;

export function InlineSelectEditor({
  value,
  options,
  onSave,
  renderDisplay,
}: InlineSelectEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (nextValue: string) => {
    setSaving(true);
    try {
      await onSave(nextValue);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <InlineEditTrigger saving={saving} onClick={() => setOpen(true)}>
        {renderDisplay()}
      </InlineEditTrigger>
    );
  }

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <InlineEditTrigger saving={saving}>{renderDisplay()}</InlineEditTrigger>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-2"
        align="center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-1">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => void handleSelect(option.value)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} className="text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type InlineInputEditorProps = Readonly<{
  value: string;
  onSave: (v: string) => Promise<void>;
  renderDisplay: () => React.ReactNode;
  inputType?: 'text' | 'email' | 'date';
  dir?: 'rtl' | 'ltr' | 'auto';
  placeholder?: string;
}>;

export function InlineInputEditor({
  value,
  onSave,
  renderDisplay,
  inputType = 'text',
  dir = 'auto',
  placeholder = '',
}: InlineInputEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft(value);
    }
  }, [open, value]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(inputType === 'date' ? draft : draft.trim());
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <InlineEditTrigger saving={saving} onClick={() => setOpen(true)}>
        {renderDisplay()}
      </InlineEditTrigger>
    );
  }

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <InlineEditTrigger saving={saving}>{renderDisplay()}</InlineEditTrigger>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <Input
            type={inputType}
            value={draft}
            dir={dir}
            placeholder={placeholder}
            onChange={(event) => setDraft(inputType === 'date' ? normalizeArabicDigits(event.target.value) : event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSave();
              }
            }}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={() => {
                setDraft(value);
                setOpen(false);
              }}
              disabled={saving}
            >
              إلغاء
            </Button>
            <div className="flex items-center gap-2">
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-destructive hover:text-destructive"
                  onClick={() => setDraft('')}
                  disabled={saving}
                >
                  مسح
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="h-8 px-3"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : 'حفظ'}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type InlineMultiSelectEditorProps = Readonly<{
  values: string[];
  options: Array<{ value: string; label: string }>;
  onSave: (values: string[]) => Promise<void>;
  renderDisplay: () => React.ReactNode;
}>;

export function InlineMultiSelectEditor({
  values,
  options,
  onSave,
  renderDisplay,
}: InlineMultiSelectEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set(values));

  useEffect(() => {
    if (!open) {
      setSelectedValues(new Set(values));
    }
  }, [open, values]);

  const handleToggle = (nextValue: string) => {
    setSelectedValues((current) => {
      const next = new Set(current);
      if (next.has(nextValue)) next.delete(nextValue);
      else next.add(nextValue);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selectedValues));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <InlineEditTrigger saving={saving} onClick={() => setOpen(true)}>
        {renderDisplay()}
      </InlineEditTrigger>
    );
  }

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <InlineEditTrigger saving={saving}>{renderDisplay()}</InlineEditTrigger>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedValues.has(option.value)}
                  onCheckedChange={() => handleToggle(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={() => {
                setSelectedValues(new Set(values));
                setOpen(false);
              }}
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 px-3"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : 'حفظ'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
