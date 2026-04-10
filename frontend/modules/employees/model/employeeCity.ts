type EmployeeCityDefinition = {
  value: string;
  label: string;
  aliases?: string[];
};

const EMPLOYEE_CITY_DEFINITIONS = [
  { value: 'riyadh', label: 'الرياض' },
  { value: 'alkharj', label: 'الخرج', aliases: ['kharj'] },
  { value: 'majmaah', label: 'المجمعة', aliases: ['majmaa', 'majma'] },
  { value: 'alzulfi', label: 'الزلفي', aliases: ['zulfi'] },
  { value: 'shaqra', label: 'شقراء' },
  { value: 'afif', label: 'عفيف' },
  { value: 'addawadmi', label: 'الدوادمي', aliases: ['dawadmi'] },
  { value: 'wadi_addawasir', label: 'وادي الدواسر', aliases: ['wadi aldawasir'] },
  { value: 'makkah', label: 'مكة المكرمة', aliases: ['mecca', 'مكة', 'مكه', 'مكة المكرمة', 'مكه المكرمة'] },
  { value: 'jeddah', label: 'جدة', aliases: ['jedda', 'jiddah', 'جده'] },
  { value: 'taif', label: 'الطائف' },
  { value: 'rabigh', label: 'رابغ' },
  { value: 'alkhunfudhah', label: 'القنفذة', aliases: ['qunfudhah', 'qunfudah'] },
  { value: 'allith', label: 'الليث', aliases: ['lith'] },
  { value: 'khulays', label: 'خليص', aliases: ['khulais'] },
  { value: 'raniyah', label: 'رنية' },
  { value: 'turbah', label: 'تربة' },
  { value: 'alkhurmah', label: 'الخرمة', aliases: ['khurmah'] },
  { value: 'madinah', label: 'المدينة المنورة', aliases: ['medina', 'madina', 'المدينة', 'المدينه'] },
  { value: 'yanbu', label: 'ينبع', aliases: ['yanbu al bahr'] },
  { value: 'alula', label: 'العلا', aliases: ['ula', 'al ula'] },
  { value: 'badr', label: 'بدر' },
  { value: 'mahd_adh_dhahab', label: 'مهد الذهب', aliases: ['mahd al dhahab', 'mahd adh dhahab'] },
  { value: 'khaybar', label: 'خيبر' },
  { value: 'dammam', label: 'الدمام' },
  { value: 'khobar', label: 'الخبر', aliases: ['alkhobar', 'al khobar'] },
  { value: 'dhahran', label: 'الظهران' },
  { value: 'jubail', label: 'الجبيل', aliases: ['aljubail', 'al jubail'] },
  { value: 'alahsa', label: 'الأحساء', aliases: ['al ahsa', 'al ahsaa', 'ahsa', 'ahsaa', 'الاحساء'] },
  { value: 'hofuf', label: 'الهفوف', aliases: ['hofouf'] },
  { value: 'mubarraz', label: 'المبرز' },
  { value: 'qatif', label: 'القطيف' },
  { value: 'ras_tanura', label: 'رأس تنورة', aliases: ['ras tanura', 'raas tanura', 'راس تنورة'] },
  { value: 'khafji', label: 'الخفجي' },
  { value: 'hafr_al_batin', label: 'حفر الباطن', aliases: ['hafar al batin', 'hafr al batin'] },
  { value: 'abqaiq', label: 'بقيق' },
  { value: 'safwa', label: 'صفوى', aliases: ['safwaa', 'صفوا'] },
  { value: 'buraidah', label: 'بريدة', aliases: ['buraydah'] },
  { value: 'unaizah', label: 'عنيزة', aliases: ['onaizah'] },
  { value: 'arras', label: 'الرس', aliases: ['alrass', 'rass'] },
  { value: 'albukayriyah', label: 'البكيرية', aliases: ['bukayriyah'] },
  { value: 'almithnab', label: 'المذنب', aliases: ['mithnab', 'muznib'] },
  { value: 'albadayea', label: 'البدائع', aliases: ['badayea', 'badai'] },
  { value: 'abha', label: 'أبها', aliases: ['ابها'] },
  { value: 'khamis_mushait', label: 'خميس مشيط' },
  { value: 'bishah', label: 'بيشة', aliases: ['bisha'] },
  { value: 'muhayil', label: 'محايل عسير', aliases: ['muhayil aseer', 'muhayil asir', 'محايل'] },
  { value: 'ahad_rufaidah', label: 'أحد رفيدة', aliases: ['ahad rafidah', 'احد رفيدة'] },
  { value: 'sarat_abidah', label: 'سراة عبيدة', aliases: ['sarat abidah'] },
  { value: 'balqarn', label: 'بلقرن' },
  { value: 'annamas', label: 'النماص', aliases: ['namas'] },
  { value: 'jazan', label: 'جازان', aliases: ['jizan', 'جيزان'] },
  { value: 'sabya', label: 'صبيا' },
  { value: 'abu_arish', label: 'أبو عريش', aliases: ['abu arish', 'ابو عريش'] },
  { value: 'samtah', label: 'صامطة' },
  { value: 'aldarb', label: 'الدرب', aliases: ['darb'] },
  { value: 'farasan', label: 'فرسان' },
  { value: 'najran', label: 'نجران' },
  { value: 'sharurah', label: 'شرورة' },
  { value: 'tabuk', label: 'تبوك' },
  { value: 'duba', label: 'ضباء', aliases: ['dhiba'] },
  { value: 'alwajh', label: 'الوجه', aliases: ['wajh'] },
  { value: 'umluj', label: 'أملج', aliases: ['املج'] },
  { value: 'tayma', label: 'تيماء', aliases: ['taymaa', 'تيما'] },
  { value: 'haql', label: 'حقل' },
  { value: 'hail', label: 'حائل', aliases: ['haail', 'حايل'] },
  { value: 'baqaa', label: 'بقعاء', aliases: ['baqa'] },
  { value: 'arar', label: 'عرعر' },
  { value: 'rafha', label: 'رفحاء', aliases: ['rafhaa'] },
  { value: 'turayf', label: 'طريف' },
  { value: 'sakaka', label: 'سكاكا', aliases: ['skaka'] },
  { value: 'domat_al_jandal', label: 'دومة الجندل', aliases: ['dumat al jandal'] },
  { value: 'qurayyat', label: 'القريات', aliases: ['qurayat'] },
  { value: 'albaha', label: 'الباحة', aliases: ['baha'] },
  { value: 'baljurashi', label: 'بلجرشي' },
  { value: 'alaqiq', label: 'العقيق' },
  { value: 'almandaq', label: 'المندق', aliases: ['mandaq'] },
] as const satisfies readonly EmployeeCityDefinition[];

function normalizeCityAlias(value: string): string {
  return String(value)
    .replaceAll('\u0640', '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const CITY_ALIAS_MAP: Record<string, string> = Object.fromEntries(
  (EMPLOYEE_CITY_DEFINITIONS as readonly EmployeeCityDefinition[]).flatMap(({ value, label, aliases = [] }) =>
    [value, label, ...aliases].map((alias) => [normalizeCityAlias(alias), value] as const),
  ),
);

const CITY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  EMPLOYEE_CITY_DEFINITIONS.map(({ value, label }) => [value, label] as const),
);

export const DEFAULT_EMPLOYEE_CITY_OPTIONS = [
  'makkah',
  'jeddah',
  'riyadh',
  'madinah',
  'dammam',
  'khobar',
  'jubail',
  'taif',
  'abha',
  'jazan',
  'tabuk',
  'buraidah',
] as const;

export function normalizeEmployeeCityValue(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return CITY_ALIAS_MAP[normalizeCityAlias(trimmed)] ?? trimmed;
}

export function splitEmployeeCitiesInput(value: string | null | undefined): string[] {
  return String(value ?? '')
    .split(/[,\n|،;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeEmployeeCities(
  values: Array<string | null | undefined>,
  fallback?: string | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const pushValue = (raw: string | null | undefined) => {
    const normalized = normalizeEmployeeCityValue(raw);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  };

  values.forEach((value) => {
    splitEmployeeCitiesInput(value).forEach(pushValue);
  });
  pushValue(fallback);

  return out;
}

export function cityLabel(value: string | null | undefined, fallback = '•'): string {
  const normalized = normalizeEmployeeCityValue(value);
  if (!normalized) return fallback;
  return CITY_LABEL_MAP[normalized] ?? normalized;
}

