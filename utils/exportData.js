/**
 * Converts an array of objects to a CSV string and triggers a browser download.
 * @param {Object[]} data - Array of row objects
 * @param {string[]} columns - Ordered list of keys to include
 * @param {Object} [headerMap] - Optional mapping of key → display header name
 * @param {string} [filename] - Download filename (without extension)
 */
export function exportToCSV(data, columns, headerMap = {}, filename = 'export') {
    if (!data || data.length === 0) return;

    const headers = columns.map(col => headerMap[col] || col);
    const escapeCell = (value) => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvRows = [
        headers.map(escapeCell).join(','),
        ...data.map(row =>
            columns.map(col => escapeCell(row[col])).join(',')
        ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Opens a styled print window for a given title and HTML table content.
 * Acts as a lightweight PDF generator via the browser's "Save as PDF" print option.
 * @param {string} title - Report title
 * @param {string} tableHtml - Full <table> HTML string
 */
export function printReport(title, tableHtml) {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #1f2937; }
                h1 { font-size: 20px; margin-bottom: 4px; }
                .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #14b8a6; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
                td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
                tr:nth-child(even) td { background: #f9fafb; }
                .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; text-align: center; }
                @media print { body { padding: 16px; } }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
            ${tableHtml}
            <div class="footer">Magic Track Admin Panel</div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    win.document.close();
}

/**
 * Builds an HTML table string from data for use with printReport.
 * @param {Object[]} data - Array of row objects
 * @param {string[]} columns - Ordered list of keys to include
 * @param {Object} [headerMap] - Optional mapping of key → display header name
 * @returns {string} HTML table string
 */
export function buildTableHtml(data, columns, headerMap = {}) {
    const headers = columns.map(col => headerMap[col] || col);
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    const bodyRows = data.map(row =>
        `<tr>${columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`
    ).join('');

    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}
