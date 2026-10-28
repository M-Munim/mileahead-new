// Customer receipt for one car wash order (A5 portrait), sent to the customer
// on WhatsApp as a link (see sendReceiptOnWhatsApp in carWashApi.js).
// jsPDF is loaded only when a receipt is made.

import { OTHER_SERVICES_TITLE, couponApplies, COUPON_RATE } from './priceList';

const ORANGE = [245, 124, 0];
const BLACK = [11, 11, 11];
const GREY = [107, 114, 128];

const qar = (n) => `QAR ${Number(n || 0).toLocaleString('en-US')}`;

// jsPDF's built-in fonts only cover Latin letters. A name written in another
// script (e.g. Arabic) is left out rather than printed as "????".
const isLatin = (text) => /^[\u0000-ɏ–—·]*$/.test(String(text ?? ''));
const latin = (text) => String(text ?? '').replace(/[^\u0000-ɏ–—·]/g, '?');

/** The receipt as a PDF Blob. */
export async function buildReceiptPdf(order) {
  const [{ jsPDF }, tableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  // The function sits on .default in a bundler, or one level deeper via CommonJS interop.
  const autoTable = [tableModule.default, tableModule.default?.default, tableModule.autoTable]
    .find((fn) => typeof fn === 'function');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // ── Title ──
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, 24, pageWidth, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Magic Track', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Car Wash Receipt', margin, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Order #${order.id}`, pageWidth - margin, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(latin(order.time || order.bookedAt || ''), pageWidth - margin, 18, { align: 'right' });

  // ── Token ──
  let y = 32;
  if (order.tokens?.length) {
    doc.setTextColor(...GREY);
    doc.setFontSize(8);
    doc.text('YOUR TOKEN', margin, y);
    doc.setTextColor(...ORANGE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(order.tokens.join('  '), margin, y + 8);
    doc.setFont('helvetica', 'normal');
    y += 14;
  }

  // ── Customer and car ──
  const name = isLatin(order.customer?.name) ? order.customer?.name : '';
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      ...(name ? [['Customer', name]] : []),
      ['Phone', latin(order.customer?.phone || '—')],
      ['Vehicle', latin(order.vehicle || '—')],
      ['Number Plate', latin(order.numberPlate || '—')],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.2 },
    columnStyles: { 0: { textColor: GREY, cellWidth: 32 }, 1: { fontStyle: 'bold' } },
  });

  // ── Services and totals ──
  const coupon = couponApplies(order.discount, order.couponSerial);
  const saved = Math.max(0, Number(order.subtotal || 0) - Number(order.total || 0));
  const rows = [
    ...(order.services || []).map((s) => [latin(s)]),
    ...(order.extras || []).map((s) => [`${latin(s)}  (${OTHER_SERVICES_TITLE})`]),
  ];
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    margin: { left: margin, right: margin },
    head: [['Services']],
    body: rows.length ? rows : [['—']],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: ORANGE, textColor: 255 },
  });

  const totals = [
    ...(saved > 0 ? [['Subtotal', qar(order.subtotal)]] : []),
    ...(order.discount
      ? [[coupon ? `Coupon ${latin(order.couponSerial)} (${COUPON_RATE * 100}% off)` : latin(order.discount), saved > 0 ? `- ${qar(saved)}` : '—']]
      : []),
    ['Total', qar(order.total)],
    ['Payment', [order.paymentMethod, order.paymentType, order.status === 'paid' ? 'Paid' : 'Unpaid'].filter(Boolean).map(latin).join(' · ')],
  ];
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 2,
    margin: { left: margin, right: margin },
    body: totals,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.4 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.row.raw[0] === 'Total') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
      }
      if (data.row.raw[0] === 'Payment' && data.column.index === 1) {
        data.cell.styles.textColor = order.status === 'paid' ? [22, 101, 52] : [185, 28, 28];
      }
    },
  });

  // ── Footer ──
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  doc.setTextColor(...BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Thank you for choosing Magic Track!', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  doc.text(`Receipt generated ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

  return doc.output('blob');
}
