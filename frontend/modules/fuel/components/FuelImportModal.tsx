import React, { useState, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useToast } from '@shared/hooks/use-toast';
import { logError } from '@shared/lib/logger';
import { getErrorMessage } from '@services/serviceError';
import { useFuel } from '@modules/fuel/hooks/useFuel';
import type { Employee, ImportRow, ImportStep } from '@modules/fuel/types/fuel.types';
import { IMPORT_STEPS, toCellString } from '@modules/fuel/types/fuel.types';

export const ImportModal = ({
  employees, monthYear, onClose, onImported,
}: {
  employees: Employee[];
  monthYear: string;
  onClose: () => void;
  onImported: () => void;
}) => {
  const { toast } = useToast();
  const fuelApi = useFuel();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState({ name: '', km: '', fuel: '__none__', notes: '__none__' });
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileBuffer = await file.arrayBuffer();
    const wb = XLSX.read(fileBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!data.length) return toast({ title: 'Ø§Ù„Ù…Ù„Ù ÙØ§Ø±Øº', variant: 'destructive' });
    setHeaders(Object.keys(data[0]));
    setRawData(data);
    setStep(2);
  };

  const buildPreview = () => {
    if (!mapping.name || !mapping.km) return toast({ title: 'Ø­Ø¯Ø¯ Ø¹Ù…ÙˆØ¯ Ø§Ù„Ø§Ø³Ù… ÙˆØ§Ù„ÙƒÙŠÙ„ÙˆÙ…ØªØ±Ø§Øª', variant: 'destructive' });
    const preview: ImportRow[] = rawData.map((r, idx) => {
      const raw_name = toCellString(r[mapping.name]).trim();
      const km_total = Number.parseFloat(toCellString(r[mapping.km])) || 0;
      const fuel_cost =
        mapping.fuel && mapping.fuel !== '__none__'
          ? Number.parseFloat(toCellString(r[mapping.fuel])) || 0
          : 0;
      const notes = mapping.notes && mapping.notes !== '__none__' ? toCellString(r[mapping.notes]) : '';
      const exact = employees.find(e => e.name === raw_name);
      const partial = exact ? null : employees.find(e => e.name.includes(raw_name) || raw_name.includes(e.name));
      return {
        row_key: `${idx}-${raw_name || 'unknown'}-${km_total}-${fuel_cost}`,
        raw_name,
        km_total,
        fuel_cost,
        notes,
        matched_employee: exact || partial || null,
      };
    }).filter(r => r.raw_name);
    setRows(preview);
    setStep(3);
  };

  const matched = rows.filter(r => r.matched_employee || r.manual_employee_id).length;
  const importStepLabel = (s: ImportStep) => {
    if (s === 1) return 'Ø±ÙØ¹ Ø§Ù„Ù…Ù„Ù';
    if (s === 2) return 'Ø±Ø¨Ø· Ø§Ù„Ø£Ø¹Ù…Ø¯Ø©';
    return 'Ù…Ø¹Ø§ÙŠÙ†Ø© ÙˆØªØ£ÙƒÙŠØ¯';
  };
  const handleManualEmployeeSelect = (rowKey: string, employeeId: string) => {
    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.row_key === rowKey ? { ...currentRow, manual_employee_id: employeeId } : currentRow
      )
    );
  };

  const doImport = async () => {
    const toSave = rows.filter(r => r.matched_employee || r.manual_employee_id);
    if (!toSave.length) return toast({ title: 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª Ù„Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯', variant: 'destructive' });
    setSaving(true);
    try {
      const payload = toSave.map(r => ({
        employee_id: r.manual_employee_id || r.matched_employee?.id || '',
        month_year: monthYear,
        km_total: r.km_total,
        fuel_cost: r.fuel_cost,
        notes: r.notes || null,
      }));
      await fuelApi.saveMonthlyMileageImport(payload, replaceExisting);
      toast({ title: `ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${payload.length} Ø³Ø¬Ù„ Ø¨Ù†Ø¬Ø§Ø­` });
      onImported();
    } catch (e) {
      logError('[Fuel] import failed', e);
      const message = getErrorMessage(e);
      toast({ title: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-border/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">Ø§Ø³ØªÙŠØ±Ø§Ø¯ ÙƒÙŠÙ„ÙˆÙ…ØªØ±Ø§Øª GPS (Ø´Ù‡Ø±ÙŠ)</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50 shrink-0">
          {IMPORT_STEPS.map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s}</div>
              <span className="text-xs text-muted-foreground">{importStepLabel(s)}</span>
              {s < 3 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <button
              type="button"
              className="w-full border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-3">ðŸ“‚</div>
              <p className="font-medium text-foreground">Ø§Ø¶ØºØ· Ù„Ø±ÙØ¹ Ù…Ù„Ù Excel Ø£Ùˆ CSV</p>
              <p className="text-sm text-muted-foreground mt-1">Ù…Ù„Ù GPS ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨ ÙˆØ§Ù„ÙƒÙŠÙ„ÙˆÙ…ØªØ±Ø§Øª</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </button>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">ØªÙ… Ø§ÙƒØªØ´Ø§Ù <strong>{headers.length}</strong> Ø¹Ù…ÙˆØ¯ Ùˆ <strong>{rawData.length}</strong> ØµÙ.</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'name' as const, label: 'Ø¹Ù…ÙˆØ¯ Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨', required: true },
                  { key: 'km' as const, label: 'Ø¹Ù…ÙˆØ¯ Ø§Ù„ÙƒÙŠÙ„ÙˆÙ…ØªØ±Ø§Øª', required: true },
                  { key: 'fuel' as const, label: 'Ø¹Ù…ÙˆØ¯ ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ù†Ø²ÙŠÙ†', required: false },
                  { key: 'notes' as const, label: 'Ø¹Ù…ÙˆØ¯ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª', required: false },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-sm mb-1.5 block">{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
                    <Select
                      value={mapping[f.key]}
                      onValueChange={v => setMapping(m => ({ ...m, [f.key]: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={f.required ? 'Ù…Ø·Ù„ÙˆØ¨' : 'Ø§Ø®ØªÙŠØ§Ø±ÙŠ'} /></SelectTrigger>
                      <SelectContent>
                        {!f.required && <SelectItem value="__none__">â€” Ù„Ø§ ÙŠÙˆØ¬Ø¯ â€”</SelectItem>}
                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button onClick={buildPreview} className="w-full">Ø§Ù„ØªØ§Ù„ÙŠ: Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</Button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="badge-success">{matched} Ù…ØªØ·Ø§Ø¨Ù‚</span>
                <span className="badge-warning">{rows.length - matched} ÙŠØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø©</span>
                <label className="flex items-center gap-1.5 ms-auto text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="align-middle" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} />
                  <span>Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø©</span>
                </label>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-start text-xs text-muted-foreground">Ø§Ù„Ø§Ø³Ù… ÙÙŠ Ø§Ù„Ù…Ù„Ù</th>
                      <th className="px-3 py-2 text-start text-xs text-muted-foreground">Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚</th>
                      <th className="px-3 py-2 text-xs text-muted-foreground">ÙƒÙ…</th>
                      <th className="px-3 py-2 text-xs text-muted-foreground">Ø¨Ù†Ø²ÙŠÙ†</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const emp = row.manual_employee_id ? employees.find(e => e.id === row.manual_employee_id) : row.matched_employee;
                      const isMatched = !!emp;
                      return (
                        <tr key={row.row_key} className={`border-t border-border/30 ${isMatched ? '' : 'bg-warning/5'}`}>
                          <td className="px-3 py-2 font-medium">{row.raw_name}</td>
                          <td className="px-3 py-2">
                            {isMatched ? (
                              <span className="text-success text-xs flex items-center gap-1"><Check size={11} /> {emp?.name}</span>
                            ) : (
                              <Select
                                value={row.manual_employee_id || ''}
                                onValueChange={(v) => handleManualEmployeeSelect(row.row_key, v)}
                              >
                                <SelectTrigger className="h-7 text-xs border-warning/50"><SelectValue placeholder="Ø§Ø®ØªØ± ÙŠØ¯ÙˆÙŠØ§Ù‹..." /></SelectTrigger>
                                <SelectContent className="max-h-48">
                                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">{row.km_total}</td>
                          <td className="px-3 py-2 text-center">{row.fuel_cost}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        {step === 3 && (
          <div className="px-6 py-4 border-t border-border shrink-0">
            <Button onClick={doImport} disabled={saving || matched === 0} className="w-full gap-2">
              {saving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯...' : <><Check size={15} /> ØªØ£ÙƒÙŠØ¯ Ø§Ø³ØªÙŠØ±Ø§Ø¯ {matched} Ø³Ø¬Ù„</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
