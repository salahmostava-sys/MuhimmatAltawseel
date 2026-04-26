import { useEffect, useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';

type PrintReportProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  showPrintButton?: boolean;
};

/**
 * PrintReport - Wraps report content with print-friendly formatting
 * Automatically applies print styles and provides a print button
 */
export function PrintReport({ 
  title, 
  subtitle, 
  children, 
  className,
  showPrintButton = true 
}: PrintReportProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add print-specific meta tags
    const meta = document.createElement('meta');
    meta.name = 'print-color-adjust';
    meta.content = 'exact';
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Print Header - visible in both screen and print */}
      <div className="print-header bg-card rounded-xl border border-border/50 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          
          {showPrintButton && (
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="gap-2 print:hidden"
            >
              <Printer size={16} />
              طباعة
            </Button>
          )}
        </div>
        
        {/* Report metadata */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
          <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</span>
          <span>•</span>
          <span>الوقت: {new Date().toLocaleTimeString('ar-SA')}</span>
        </div>
      </div>

      {/* Report Content */}
      <div ref={contentRef} className="print-content">
        {children}
      </div>

      {/* Print Footer - only visible when printing */}
      <div className="hidden print:block print-footer mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>مهمات التوصيل - نظام إدارة المناديب</p>
        <p>تم الطباعة في {new Date().toLocaleDateString('ar-SA')} - {new Date().toLocaleTimeString('ar-SA')}</p>
      </div>
    </div>
  );
}

/**
 * PrintTable - A table optimized for printing with proper page breaks
 */
export function PrintTable({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string 
}) {
  return (
    <div className={cn("overflow-x-auto print:overflow-visible", className)}>
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  );
}

/**
 * PrintTableHeader - Table header with print-optimized styling
 */
export function PrintTableHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string 
}) {
  return (
    <thead className={cn("bg-gray-100 print:bg-gray-200", className)}>
      <tr>
        {children}
      </tr>
    </thead>
  );
}

/**
 * PrintTableCell - Table cell with print-optimized styling
 */
export function PrintTableCell({ 
  children, 
  className,
  header = false
}: { 
  children: React.ReactNode; 
  className?: string;
  header?: boolean;
}) {
  const Component = header ? 'th' : 'td';
  
  return (
    <Component
      className={cn(
        "px-4 py-3 text-sm border border-gray-200 print:border-gray-400",
        header ? "font-semibold text-gray-700 print:text-gray-900" : "text-gray-600 print:text-gray-800",
        className
      )}
    >
      {children}
    </Component>
  );
}

/**
 * PrintSummaryCard - Summary statistics card for print reports
 */
export function PrintSummaryCard({ 
  label, 
  value, 
  className 
}: { 
  label: string; 
  value: string | number; 
  className?: string 
}) {
  return (
    <div className={cn(
      "bg-card rounded-lg border border-border/50 p-4 print:border-gray-400 print:shadow-none",
      className
    )}>
      <p className="text-xs text-muted-foreground print:text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-foreground print:text-gray-900 mt-1">{value}</p>
    </div>
  );
}
