// Day Close report as a downloadable PDF (A4 landscape), built from the same
// report data as the page, the Excel file and the WhatsApp summary.
// jsPDF is loaded only when someone clicks "Download PDF".

import { rangeLabel, summaryLines, paymentModeOf, timeOf } from './dayClose';

const ORANGE = [245, 124, 0];
const BLACK = [11, 11, 11];
const GREY = [107, 114, 128];
const UNPAID_FILL = [254, 242, 242];

const qar = (n) => `QAR ${Number(n || 0).toLocaleString('en-US')}`;

// jsPDF's built-in fonts only cover Latin letters; anything else (e.g. an
// Arabic name) would print as garbage, so it is replaced with "?".
const latin = (text) => String(text ?? '').replace(/[^\u0000-ɏ–—·]/g, '?');

export async function downloadDayReportPdf(report, { printedBy } = {}) {
  const [{ jsPDF }, tableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  // The function sits on .default in a bundler, or one level deeper via CommonJS interop.
  const autoTable = [tableModule.default, tableModule.default?.default, tableModule.autoTable]
    .find((fn) => typeof fn === 'function');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const period = rangeLabel(report.from, report.to);

  // ── Title ──
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, 22, pageWidth, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Magic Track — Daily Report', margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(period, margin, 16.5);
  doc.setFontSize(8);
  doc.text(
    `Generated ${new Date().toLocaleString('en-GB')}${printedBy ? ` by ${latin(printedBy)}` : ''}`,
    pageWidth - margin,
    16.5,
    { align: 'right' },
  );

  // ── Headline figures ──
  const cards = [
    ['Total collected', qar(report.collected), `${report.paidCount} paid orders`],
    ['Cash', qar(report.byChannel.cash.amount), `${report.byChannel.cash.count} orders`],
    ['Card', qar(report.byChannel.card.amount), `${report.byChannel.card.count} orders`],
    ['Online (Fawran)', qar(report.byChannel.online.amount), `${report.byChannel.online.count} orders`],
    ['Still to collect', qar(report.stillToCollect.amount), `${report.stillToCollect.count} unpaid`],
    ['Discounts given', qar(report.discountTotal), `${report.orders.length} orders in total`],
  ];
  const gap = 3;
  const cardWidth = (pageWidth - margin * 2 - gap * (cards.length - 1)) / cards.length;
  cards.forEach(([label, value, sub], i) => {
    const x = margin + i * (cardWidth + gap);
    const y = 28;
    const main = i === 0;
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(...(main ? ORANGE : [255, 255, 255]));
    doc.rect(x, y, cardWidth, 18, main ? 'F' : 'FD');
    doc.setTextColor(...(main ? [255, 255, 255] : GREY));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(label, x + 3, y + 5);
    doc.setTextColor(...(main ? [255, 255, 255] : i === 4 && report.stillToCollect.count ? [185, 28, 28] : [17, 24, 39]));
    doc.setFontSize(12);
    doc.text(value, x + 3, y + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...(main ? [255, 255, 255] : GREY));
    doc.text(sub, x + 3, y + 15.5);
  });

  // ── Totals block (the client's format) + work done, side by side ──
  const half = (pageWidth - margin * 2 - 6) / 2;
  const lines = summaryLines(report);
  autoTable(doc, {
    startY: 51,
    margin: { left: margin, right: pageWidth - margin - half },
    head: [['Totals', '']],
    body: [
      ...lines.map((l) => [l.label, qar(l.amount)]),
      [`Still to collect (${report.stillToCollect.count} unpaid)`, qar(report.stillToCollect.amount)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: ORANGE, textColor: 255 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const label = data.row.raw[0];
      if (label === 'Total Net Amount') data.cell.styles.fontStyle = 'bold';
      if (String(label).startsWith('Still to collect')) data.cell.styles.textColor = [185, 28, 28];
    },
  });
  const totalsEnd = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: 51,
    margin: { left: margin + half + 6, right: margin },
    head: [['Work done', 'Jobs']],
    body: report.services.length ? report.services.map((s) => [latin(s.name), s.count]) : [['No orders', '']],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: ORANGE, textColor: 255 },
    columnStyles: { 1: { halign: 'right' } },
  });
  const workEnd = doc.lastAutoTable.finalY;

  // ── Every order ──
  autoTable(doc, {
    startY: Math.max(totalsEnd, workEnd) + 6,
    margin: { left: margin, right: margin, top: 14 },
    head: [['#', 'Order', 'Time', 'Name', 'Phone', 'Plate', 'Vehicle', 'Services', 'Discount', 'Amount', 'Payment Mode']],
    body: report.orders.map((o, i) => [
      i + 1,
      `#${o.id}${o.tokens?.length ? `\n${o.tokens.join(' ')}` : ''}`,
      report.from === report.to ? timeOf(o) : `${o.date} ${timeOf(o)}`,
      latin(o.customer?.name || '—'),
      latin(o.customer?.phone || '—'),
      latin(o.numberPlate || '—'),
      latin(o.vehicle || '—'),
      latin([(o.services || []).join(' + '), (o.extras || []).join(', ')].filter(Boolean).join(' + ') || '—'),
      latin(o.discount || '—'),
      qar(o.total),
      paymentModeOf(o),
    ]),
    foot: [['', '', '', '', '', '', '', 'Total Net Amount (paid orders)', '', qar(report.collected), '']],
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 1.4, overflow: 'linebreak' },
    headStyles: { fillColor: BLACK, textColor: 255 },
    footStyles: { fillColor: [243, 244, 246], textColor: 17, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 8 }, 7: { cellWidth: 62 }, 9: { halign: 'right' } },
    showFoot: 'lastPage',
    didParseCell: (data) => {
      if (data.section === 'body' && report.orders[data.row.index]?.status !== 'paid') {
        data.cell.styles.fillColor = UNPAID_FILL;
        if (data.column.index === 10) data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  // ── Page numbers ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(`Magic Track — Daily Report · ${period}`, margin, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${p} of ${pages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }

  doc.save(report.from === report.to
    ? `MagicTrack-DailyReport-${report.from}.pdf`
    : `MagicTrack-DailyReport-${report.from}_to_${report.to}.pdf`);
}
