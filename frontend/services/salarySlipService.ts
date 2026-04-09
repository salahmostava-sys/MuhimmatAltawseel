/**
 * salarySlipService — Legacy fallback removed.
 *
 * PDF generation is now handled by the HTML-based invoice system:
 * - buildSalarySlipHTML() for HTML generation
 * - salarySlipActions.ts for preview/print/PDF export
 *
 * This file is kept as a barrel for backward compatibility.
 */

export interface SalarySlipDriver {
  name: string;
  nationalId?: string | null;
}

export const salarySlipService = {
  // Legacy generateSalaryPDF has been removed.
  // Use buildSalarySlipHTML + exportSlipPDF from salarySlipActions instead.
};

export default salarySlipService;
