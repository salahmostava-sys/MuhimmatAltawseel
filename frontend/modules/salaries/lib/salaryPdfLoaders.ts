/** تحميل كسول لمكتبات الطباعة والتصدير — يُستخدم في صفحة الرواتب وكشف الراتب. */

export const loadJsPdf = async () => (await import('jspdf')).default;

export const loadJsZip = async () => (await import('jszip')).default;

export { loadXlsx } from '@modules/orders/utils/xlsx';
