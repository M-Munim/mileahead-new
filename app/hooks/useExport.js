import { useCallback } from 'react';
import { exportToCSV, printReport, buildTableHtml } from '../../utils/exportData';

/**
 * Reusable hook for CSV export and print report functionality.
 * @param {Object} options
 * @param {string[]} options.columns - Column keys to include
 * @param {Object} options.headerMap - Key-to-display-name mapping
 * @param {string} options.filename - Base filename for export
 * @param {string} options.title - Report title for printing
 * @returns {{ handleExportCSV: function, handlePrintReport: function }}
 */
export function useExport({ columns, headerMap, filename, title }) {
  const handleExportCSV = useCallback((data) => {
    exportToCSV(data, columns, headerMap, filename);
  }, [columns, headerMap, filename]);

  const handlePrintReport = useCallback((data) => {
    const html = buildTableHtml(data, columns, headerMap);
    printReport(`${title} — Magic Track`, html);
  }, [columns, headerMap, title]);

  return { handleExportCSV, handlePrintReport };
}
