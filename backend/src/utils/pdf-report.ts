import { createRequire } from 'module';
import { buffer as streamToBuffer } from 'stream/consumers';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

const REPORT_TYPE_LABELS: Record<string, string> = {
  consolidated: 'Relatório Consolidado',
  transactions: 'Extrato de Transações',
  portfolio_analysis: 'Análise de Portfólio',
  monthly: 'Relatório Mensal',
  monthly_evolution: 'Relatório Mensal',
  advisor_custom: 'Relatório Personalizado',
  financial_planning: 'Planejamento Financeiro',
  custom: 'Relatório Customizado',
};

/** Minimal valid PDF with one line of text when pdfkit is not available. */
export function getFallbackPdfBuffer(reportType: string, createdAt: string): Buffer {
  const title = `Relatorio zurT - ${reportType} - ${createdAt}`;
  const escapedTitle = title.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const streamContent = `BT
/F1 14 Tf
50 700 Td
(${escapedTitle}) Tj
ET
`;
  const streamLen = Buffer.byteLength(streamContent, 'utf8');
  const lines: string[] = [];
  lines.push('%PDF-1.4\n');
  const off1 = Buffer.byteLength(lines.join(''), 'utf8');
  lines.push('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n');
  const off2 = Buffer.byteLength(lines.join(''), 'utf8');
  lines.push('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n');
  const off3 = Buffer.byteLength(lines.join(''), 'utf8');
  lines.push('3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n');
  const off4 = Buffer.byteLength(lines.join(''), 'utf8');
  lines.push(`4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n`);
  const off5 = Buffer.byteLength(lines.join(''), 'utf8');
  lines.push(`5 0 obj<</Length ${streamLen}>>stream
${streamContent}
endstream
endobj
`);
  const xrefStart = Buffer.byteLength(lines.join(''), 'utf8');
  const xref = [
    'xref', '0 6', '0000000000 65535 f ',
    `${String(off1).padStart(10, '0')} 00000 n `, `${String(off2).padStart(10, '0')} 00000 n `,
    `${String(off3).padStart(10, '0')} 00000 n `, `${String(off4).padStart(10, '0')} 00000 n `,
    `${String(off5).padStart(10, '0')} 00000 n `,
    'trailer<</Size 6/Root 1 0 R>>', 'startxref', String(xrefStart), '%%EOF',
  ].join('\n');
  lines.push(xref);
  return Buffer.from(lines.join(''), 'utf8');
}

export type TransactionRow = {
  occurred_at: Date | string;
  description: string | null;
  merchant: string | null;
  category: string | null;
  amount_cents: number;
  currency: string;
  account_name?: string | null;
};

/** Data-driven portfolio report: only includes content that exists in the payload (from DB). */
export type PortfolioReportPayload = {
  clientName: string;
  reportDate: string;
  companyName?: string;
  /** Bank/Open Finance accounts. */
  accounts?: Array<{ name: string; type?: string; balance: number }>;
  /** Credit cards (balance = debt). */
  creditCards?: Array<{ name: string; brand?: string; last4?: string; balance: number; limit?: number }>;
  /** Investments from pluggy_investments or holdings. */
  investments: Array<{
    name: string;
    type?: string;
    current_value: number;
    profitability?: number | null;
    quantity?: number | null;
    unit_price?: number | null;
  }>;
  /** Sum of investment values (can be computed from investments). */
  totalValue?: number;
  /** Optional: cash balance for consolidated view. */
  cashBalance?: number;
  /** Optional: total debt for consolidated view. */
  totalDebt?: number;
  /** Optional: transaction summary for the period. */
  transactionsSummary?: { count: number; totalIn: number; totalOut: number };
  /** Optional: recent transactions for portfolio report. */
  transactions?: TransactionRow[];
};

function formatBRL(cents: number): string {
  const value = cents / 100;
  return value >= 0
    ? `R$ ${value.toFixed(2).replace('.', ',')}`
    : `- R$ ${Math.abs(value).toFixed(2).replace('.', ',')}`;
}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatBRLFromNumber(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

const DARK_BLUE = '#1e3a5f';
const LIGHT_BLUE = '#b3d9f2';
const YELLOW_BG = '#fffde7';
const FOOTER_HEIGHT = 70;
const BOTTOM_Y = 792 - 50 - FOOTER_HEIGHT;
const PAGE_CX = 306;
const PAGE_CY = 396;

/** Draw a diagonal watermark on the current page (centered, semi-transparent). */
function drawWatermark(doc: any, text: string) {
  if (!text) return;
  doc.save();
  doc.opacity(0.15);
  doc.fontSize(44).fillColor('#1e3a5f');
  doc.rotate(-45, { origin: [PAGE_CX, PAGE_CY] });
  doc.text(text, PAGE_CX - 240, PAGE_CY - 16, { width: 480, align: 'center' });
  doc.restore();
}

/** Ensure we have room for at least needed pt; if not, add a new page. Optional onNewPage called after adding a page. Returns current doc.y (top of new page if added). */
function ensureSpace(doc: any, margin: number, needed: number, onNewPage?: () => void): number {
  if (doc.y + needed > BOTTOM_Y) {
    doc.addPage({ size: 'A4', margin });
    if (onNewPage) onNewPage();
    return margin;
  }
  return doc.y;
}

/** Draw portfolio report from DB-driven payload. No fixed page count; sections only if data exists; pagination by content. */
function drawPortfolioReportFromData(doc: any, data: PortfolioReportPayload, reportTitle?: string, opts?: { watermarkText?: string; reportDescription?: string }) {
  const margin = 50;
  const pageW = 612 - margin * 2;
  const company = data.companyName || 'zurT';
  const totalValue = data.totalValue ?? data.investments.reduce((s, i) => s + Number(i.current_value || 0), 0);
  const hasInvestments = data.investments.length > 0;
  const title = reportTitle || 'Relatório de Portfólio';
  const watermarkText = opts?.watermarkText;
  const reportDescription = opts?.reportDescription;
  const onNewPage = watermarkText ? () => drawWatermark(doc, watermarkText) : undefined;
  const ensure = (m: number, needed: number) => ensureSpace(doc, m, needed, onNewPage);

  if (watermarkText) drawWatermark(doc, watermarkText);

  // -------- Header (first page) --------
  doc.fontSize(10).fillColor('#333333');
  doc.text(company.toUpperCase(), margin, 50, { continued: false });
  doc.fontSize(8).fillColor('#666666').text(title, margin, 62, { continued: false });

  doc.fontSize(16).fillColor('#1e3a5f').text(title, 612 - margin - 200, 48, { width: 200, align: 'right' });
  doc.fontSize(9).fillColor('#64748b').text(`Data: ${data.reportDate}`, 612 - margin - 200, 66, { width: 200, align: 'right' });
  doc.fontSize(9).fillColor('#64748b').text(`Cliente: ${data.clientName}`, 612 - margin - 200, 76, { width: 200, align: 'right' });
  let headerBottom = 88;
  if (reportDescription) {
    doc.fontSize(8).fillColor('#94a3b8').text(reportDescription, 612 - margin - 200, 86, { width: 200, align: 'right' });
    headerBottom = 98;
  }
  doc.moveTo(margin, headerBottom).lineTo(margin + pageW, headerBottom).stroke('#e2e8f0');
  let y = headerBottom + 7;

  // -------- Resumo (summary stats - 4 metrics, user-friendly cards) --------
  const totalCash = data.cashBalance ?? (data.accounts?.reduce((s, a) => s + a.balance, 0) ?? 0);
  const totalDebt = data.totalDebt ?? (data.creditCards?.reduce((s, c) => s + c.balance, 0) ?? 0);
  const avgProfitability = hasInvestments && totalValue > 0 && data.investments.some((i) => i.profitability != null)
    ? data.investments.reduce((s, i) => s + Number(i.current_value || 0) * (i.profitability != null ? Number(i.profitability) : 0), 0) / totalValue
    : null;
  // Always show Resumo (consolidated statement: assets, profitability, balances, liabilities)
  y = ensure(margin, 80);
  doc.y = y;
  const resumoBarH = 18;
  doc.fillColor('#dbeafe').rect(margin, doc.y, pageW, resumoBarH).fill();
  doc.rect(margin, doc.y, 4, resumoBarH).fill(DARK_BLUE);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a5f').text('Resumo', margin + 12, doc.y + 4, { continued: false });
  doc.font('Helvetica');
  doc.y += resumoBarH + 4;
  const gap = 8;
  const cardW = (pageW - gap * 3) / 4;
  const boxH = 52;
  const metrics = [
    { label: 'Patrimônio em investimentos', value: hasInvestments ? formatBRLFromNumber(totalValue) : 'R$ 0,00', sub: hasInvestments ? `${data.investments.length} ativo(s)` : 'Sem ativos', accent: '#0ea5e9', bg: '#eff6ff' },
    { label: 'Rentabilidade média', value: avgProfitability != null ? `CDI + ${avgProfitability.toFixed(2)}%` : '—', sub: 'Média ponderada', accent: '#10b981', bg: '#ecfdf5' },
    { label: 'Saldo em contas', value: formatBRLFromNumber(totalCash), sub: 'Contas bancárias', accent: '#6366f1', bg: '#eef2ff' },
    { label: 'Dívida (cartões)', value: formatBRLFromNumber(totalDebt), sub: 'Total a pagar', accent: '#f59e0b', bg: '#fffbeb' },
  ];
  const cardY = doc.y;
  for (let i = 0; i < metrics.length; i++) {
    const x = margin + i * (cardW + gap);
    doc.fillColor(metrics[i].bg).rect(x, cardY, cardW, boxH).fill();
    doc.strokeColor(metrics[i].accent).lineWidth(2).rect(x, cardY, cardW, boxH).stroke();
    doc.rect(x, cardY, 4, boxH).fill(metrics[i].accent);
    doc.fontSize(7).fillColor('#64748b').text(metrics[i].label.toUpperCase(), x + 14, cardY + 8, { width: cardW - 18, lineGap: 2 });
    doc.fontSize(12).fillColor('#1e3a5f').text(metrics[i].value, x + 14, cardY + 28, { width: cardW - 18 });
    doc.fontSize(7).fillColor('#94a3b8').text(metrics[i].sub, x + 14, cardY + 44, { width: cardW - 18 });
  }
  doc.y = cardY + boxH + 14;

  const hasAccounts = data.accounts && data.accounts.length > 0;
  const hasCards = data.creditCards && data.creditCards.length > 0;

  // -------- Contas (accounts) - always show for consolidated statement --------
  y = ensure(margin, 70);
  doc.y = y;
  const sectionBarH = 18;
  doc.fillColor('#dbeafe').rect(margin, doc.y, pageW, sectionBarH).fill();
  doc.rect(margin, doc.y, 4, sectionBarH).fill(DARK_BLUE);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a5f').text('Contas', margin + 12, doc.y + 4, { continued: false });
  doc.font('Helvetica');
  doc.y += sectionBarH;
  doc.moveTo(margin, doc.y).lineTo(margin + pageW, doc.y).stroke('#e2e8f0');
  doc.y += 10;
  const acctTypeW = 120;
  const acctValueW = 118;
  const acctNameW = pageW - acctTypeW - acctValueW;
  const acctColW = { name: acctNameW, type: acctTypeW, value: acctValueW };
  const acctTableW = pageW;
  const acctRowH = 13;
  const pad = 6;
  const acctHeaderH = 16;
  const acctHeaderY = doc.y;
  doc.rect(margin, acctHeaderY, acctTableW, acctHeaderH).fill(DARK_BLUE);
  doc.strokeColor('#1e3a5f').lineWidth(1).rect(margin, acctHeaderY, acctTableW, acctHeaderH).stroke();
  doc.fontSize(8).fillColor('#ffffff');
  doc.text('CONTA', margin + pad, acctHeaderY + 5, { width: acctColW.name - pad });
  doc.text('TIPO', margin + acctColW.name + pad, acctHeaderY + 5, { width: acctColW.type - pad });
  doc.text('SALDO (R$)', margin + acctColW.name + acctColW.type + pad, acctHeaderY + 5, { width: acctColW.value - pad, align: 'right' });
  doc.y = acctHeaderY + acctHeaderH;
  const accountTypeLabel = (t: string | undefined) => (t === 'CHECKING_ACCOUNT' ? 'Conta corrente' : t === 'CREDIT_CARD' ? 'Cartão' : (t || '—').replace(/_/g, ' '));
  const acctStroke = '#cbd5e1';
  if (hasAccounts) {
    data.accounts!.forEach((acct, idx) => {
      doc.y = ensure(margin, acctRowH + 6);
      const rowY = doc.y;
      if (idx % 2 === 1) doc.fillColor('#f8fafc').rect(margin, rowY, acctTableW, acctRowH).fill();
      doc.strokeColor(acctStroke).lineWidth(0.5).rect(margin, rowY, acctTableW, acctRowH).stroke();
      doc.fontSize(8).fillColor('#334155');
      doc.text((acct.name || '—').slice(0, 50), margin + pad, rowY + 3, { width: acctColW.name - pad * 2 });
      doc.text(accountTypeLabel(acct.type), margin + acctColW.name + pad, rowY + 3, { width: acctColW.type - pad * 2 });
      doc.text(formatBRLFromNumber(acct.balance), margin + acctColW.name + acctColW.type + pad, rowY + 3, { width: acctColW.value - pad, align: 'right' });
      doc.y = rowY + acctRowH;
    });
    const acctTotal = data.accounts!.reduce((s, a) => s + a.balance, 0);
    doc.y += 0;
    const acctTotalRowY = doc.y;
    doc.fillColor('#f1f5f9').rect(margin, acctTotalRowY, acctTableW, acctRowH).fill();
    doc.strokeColor(acctStroke).lineWidth(0.5).rect(margin, acctTotalRowY, acctTableW, acctRowH).stroke();
    doc.fontSize(8).fillColor('#1e3a5f');
    doc.text('Total', margin + pad, acctTotalRowY + 3, { width: acctColW.name - pad });
    doc.text(formatBRLFromNumber(acctTotal), margin + acctColW.name + acctColW.type + pad, acctTotalRowY + 3, { width: acctColW.value - pad, align: 'right' });
    doc.y = acctTotalRowY + acctRowH;
  } else {
    doc.rect(margin, doc.y, acctTableW, acctRowH).stroke(acctStroke);
    doc.fontSize(8).fillColor('#64748b');
    doc.text('Nenhuma conta bancária vinculada.', margin + pad, doc.y + 3, { width: acctColW.name });
    doc.text('R$ 0,00', margin + acctColW.name + acctColW.type + pad, doc.y + 3, { width: acctColW.value - pad, align: 'right' });
    doc.y += acctRowH;
  }
  const acctTableBottom = doc.y;
  doc.strokeColor(acctStroke).lineWidth(0.5);
  doc.moveTo(margin + acctColW.name, acctHeaderY).lineTo(margin + acctColW.name, acctTableBottom).stroke();
  doc.moveTo(margin + acctColW.name + acctColW.type, acctHeaderY).lineTo(margin + acctColW.name + acctColW.type, acctTableBottom).stroke();
  doc.rect(margin, acctHeaderY, acctTableW, acctTableBottom - acctHeaderY).stroke();
  doc.y += 12;

  // -------- Cartões de crédito - always show for consolidated statement --------
  y = ensure(margin, 70);
  doc.y = y;
  doc.fillColor('#dbeafe').rect(margin, doc.y, pageW, sectionBarH).fill();
  doc.rect(margin, doc.y, 4, sectionBarH).fill(DARK_BLUE);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a5f').text('Cartões de Crédito', margin + 12, doc.y + 4, { continued: false });
  doc.font('Helvetica');
  doc.y += sectionBarH;
  doc.moveTo(margin, doc.y).lineTo(margin + pageW, doc.y).stroke('#e2e8f0');
  doc.y += 10;
  const cardPad = 6;
  const cardBalanceW = 100;
  const cardLimitW = 98;
  const cardLast4W = 44;
  const cardBrandW = 72;
  const cardNameW = pageW - cardBrandW - cardLast4W - cardBalanceW - cardLimitW;
  const cardColW = { name: cardNameW, brand: cardBrandW, last4: cardLast4W, balance: cardBalanceW, limit: cardLimitW };
  const cardTableW = pageW;
  const cardRowH = 13;
  const cardHeaderY = doc.y;
  doc.rect(margin, cardHeaderY, cardTableW, 16).fill(DARK_BLUE).stroke('#1e3a5f');
  doc.fontSize(8).fillColor('#ffffff');
  doc.text('CARTÃO', margin + cardPad, cardHeaderY + 5, { width: cardColW.name - cardPad });
  doc.text('BANDEIRA', margin + cardColW.name + cardPad, cardHeaderY + 5, { width: cardColW.brand - cardPad });
  doc.text('FIM', margin + cardColW.name + cardColW.brand + cardPad, cardHeaderY + 5, { width: cardColW.last4 - cardPad });
  doc.text('DÍVIDA (R$)', margin + cardColW.name + cardColW.brand + cardColW.last4 + cardPad, cardHeaderY + 5, { width: cardColW.balance - cardPad, align: 'right' });
  doc.text('LIMITE (R$)', margin + cardColW.name + cardColW.brand + cardColW.last4 + cardColW.balance + cardPad, cardHeaderY + 5, { width: cardColW.limit - cardPad, align: 'right' });
  doc.y = cardHeaderY + 16;
  if (hasCards) {
    const cardTotalDebt = data.creditCards!.reduce((s, c) => s + c.balance, 0);
    data.creditCards!.forEach((card, idx) => {
      doc.y = ensure(margin, cardRowH + 6);
      const rowY = doc.y;
      doc.rect(margin, rowY, cardTableW, cardRowH).stroke('#e5e7eb');
      if (idx % 2 === 1) doc.rect(margin, rowY, cardTableW, cardRowH).fill('#f8fafc');
      doc.fontSize(8).fillColor('#334155');
      doc.text((card.name || '—').slice(0, 38), margin + cardPad, rowY + 3, { width: cardColW.name - cardPad * 2 });
      doc.text((card.brand || '—').slice(0, 10), margin + cardColW.name + cardPad, rowY + 3, { width: cardColW.brand - cardPad * 2 });
      doc.text(card.last4 || '—', margin + cardColW.name + cardColW.brand + cardPad, rowY + 3, { width: cardColW.last4 - cardPad * 2 });
      doc.text(formatBRLFromNumber(card.balance), margin + cardColW.name + cardColW.brand + cardColW.last4 + cardPad, rowY + 3, { width: cardColW.balance - cardPad, align: 'right' });
      doc.text(card.limit != null ? formatBRLFromNumber(card.limit) : '—', margin + cardColW.name + cardColW.brand + cardColW.last4 + cardColW.balance + cardPad, rowY + 3, { width: cardColW.limit - cardPad, align: 'right' });
      doc.y = rowY + cardRowH;
    });
    doc.y += 2;
    const totalRowY = doc.y;
    doc.rect(margin, totalRowY, cardTableW, cardRowH).fill('#fef2f2').stroke('#fecaca');
    doc.fontSize(8).fillColor('#991b1b');
    doc.text('Total a pagar', margin + cardPad, totalRowY + 3, { width: cardColW.name - cardPad });
    doc.text(formatBRLFromNumber(cardTotalDebt), margin + cardColW.name + cardColW.brand + cardColW.last4 + cardPad, totalRowY + 3, { width: cardColW.balance - cardPad, align: 'right' });
    doc.y = totalRowY + cardRowH + 12;
  } else {
    doc.rect(margin, doc.y, cardTableW, cardRowH).stroke('#e5e7eb');
    doc.fontSize(8).fillColor('#64748b');
    doc.text('Nenhum cartão de crédito vinculado.', margin + cardPad, doc.y + 3, { width: cardColW.name });
    doc.text('R$ 0,00', margin + cardColW.name + cardColW.brand + cardColW.last4 + cardPad, doc.y + 3, { width: cardColW.balance - cardPad, align: 'right' });
    doc.y += cardRowH + 12;
  }

  // -------- Histórico de Transações (últimos 3 meses) - always show for consolidated statement --------
  const hasTransactions = data.transactions && data.transactions.length > 0;
  y = ensure(margin, 80);
  doc.y = y;
  doc.fillColor('#dbeafe').rect(margin, doc.y, pageW, sectionBarH).fill();
  doc.rect(margin, doc.y, 4, sectionBarH).fill(DARK_BLUE);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a5f').text('Histórico de Transações (últimos 3 meses)', margin + 12, doc.y + 4, { continued: false });
  doc.font('Helvetica');
  doc.y += sectionBarH;
  doc.moveTo(margin, doc.y).lineTo(margin + pageW, doc.y).stroke('#e2e8f0');
  doc.y += 10;
  const txColW = { date: 58, desc: pageW - 58 - 54 - 78, category: 54, amount: 78 };
  const txTableW = pageW;
  const txRowHeight = 10;
  const txHeaderH = 14;
  const drawTxHeader = (yPos: number) => {
    doc.rect(margin, yPos, txTableW, txHeaderH).fill(DARK_BLUE).stroke('#1e3a5f');
    doc.fontSize(8).fillColor('#ffffff');
    doc.text('Data', margin + 5, yPos + 4, { width: txColW.date - 4 });
    doc.text('Descrição', margin + txColW.date + 5, yPos + 4, { width: txColW.desc - 4 });
    doc.text('Categoria', margin + txColW.date + txColW.desc + 5, yPos + 4, { width: txColW.category - 4 });
    doc.text('Valor', margin + txColW.date + txColW.desc + txColW.category + 5, yPos + 4, { width: txColW.amount - 6, align: 'right' });
  };
  if (hasTransactions) {
    const txList = data.transactions!.slice(0, 150);
    drawTxHeader(doc.y);
    doc.y += txHeaderH;
    for (let i = 0; i < txList.length; i++) {
      const row = txList[i];
      doc.y = ensure(margin, txRowHeight + 4);
      if (doc.y === margin) {
        drawTxHeader(margin);
        doc.y = margin + txHeaderH;
      }
      const rowY = doc.y;
      if (i % 2 === 1) {
        doc.fillColor('#f8fafc');
        doc.rect(margin, rowY, txTableW, txRowHeight).fill();
      }
      doc.strokeColor('#e5e7eb');
      doc.rect(margin, rowY, txTableW, txRowHeight).stroke();
      const desc = (row.description || row.merchant || '—').slice(0, 48);
      const cat = (row.category || '—').slice(0, 14);
      const amountStr = formatBRL(row.amount_cents);
      const isNeg = row.amount_cents < 0;
      doc.fontSize(8).fillColor(isNeg ? '#b91c1c' : '#333333');
      doc.text(formatDate(row.occurred_at), margin + 4, rowY + 2, { width: txColW.date - 4 });
      doc.text(desc, margin + txColW.date + 4, rowY + 2, { width: txColW.desc - 4 });
      doc.text(cat, margin + txColW.date + txColW.desc + 4, rowY + 2, { width: txColW.category - 4 });
      doc.text(amountStr, margin + txColW.date + txColW.desc + txColW.category + 4, rowY + 2, { width: txColW.amount - 4, align: 'right' });
      doc.y = rowY + txRowHeight;
    }
    doc.y += 2;
    doc.fontSize(8).fillColor('#64748b').text(
      `Total: ${txList.length} transação(ões) nos últimos 3 meses.`,
      margin, doc.y, { width: txTableW }
    );
    doc.y += 14;
  } else {
    drawTxHeader(doc.y);
    doc.y += txHeaderH;
    doc.rect(margin, doc.y, txTableW, txRowHeight).stroke('#e5e7eb');
    doc.fontSize(8).fillColor('#64748b');
    doc.text('Nenhuma transação nos últimos 3 meses.', margin + 5, doc.y + 2, { width: txColW.desc });
    doc.y += txRowHeight + 14;
  }

  // -------- Histórico de Investimentos (Composição da Carteira) --------
  if (hasInvestments) {
    y = ensure(margin, 85);
    doc.y = y;
    doc.rect(margin, doc.y - 2, 4, 14).fill(DARK_BLUE);
    doc.fontSize(11).fillColor(DARK_BLUE).text('Histórico de Investimentos — Composição da Carteira', margin + 12, doc.y, { continued: false });
    doc.y += 14;
    doc.moveTo(margin, doc.y).lineTo(margin + pageW, doc.y).stroke('#e2e8f0');
    doc.y += 10;
    y = doc.y;

    const colW = { name: 240, type: 90, profitability: 92, value: 90 };
    const tableW = pageW;
    const rowHeight = 14;
    doc.rect(margin, y, tableW, 16).fill(DARK_BLUE).stroke('#1e3a5f');
    doc.fontSize(8).fillColor('#ffffff');
    doc.text('PRODUTO', margin + 6, y + 5, { width: colW.name });
    doc.text('TIPO', margin + colW.name + 6, y + 5, { width: colW.type });
    doc.text('RENTABILIDADE', margin + colW.name + colW.type + 6, y + 5, { width: colW.profitability });
    doc.text('VALOR (R$)', margin + colW.name + colW.type + colW.profitability + 6, y + 5, { width: colW.value, align: 'right' });
    y += 18;
    doc.y = y;

    data.investments.forEach((row, i) => {
      const drawY = ensure(margin, rowHeight + 4);
      doc.y = drawY;
      doc.rect(margin, drawY, tableW, rowHeight).stroke('#e5e7eb');
      if (i % 2 === 1) doc.rect(margin, drawY, tableW, rowHeight).fill('#f8fafc');
      doc.fontSize(8).fillColor('#334155');
      const name = (row.name || '—').slice(0, 48);
      const type = (row.type || '—').slice(0, 16);
      const prof = row.profitability != null ? `CDI + ${Number(row.profitability).toFixed(2)}%` : '—';
      const valueStr = formatBRLFromNumber(Number(row.current_value || 0));
      doc.text(name, margin + 6, doc.y + 3, { width: colW.name - 6 });
      doc.text(type, margin + colW.name + 6, doc.y + 3, { width: colW.type - 6 });
      doc.text(prof, margin + colW.name + colW.type + 6, doc.y + 3, { width: colW.profitability - 6 });
      doc.text(valueStr, margin + colW.name + colW.type + colW.profitability + 6, doc.y + 3, { width: colW.value - 6, align: 'right' });
      doc.y += rowHeight;
    });
    doc.y += 2;
    doc.rect(margin, doc.y, tableW, rowHeight).fill('#ecfdf5').stroke('#a7f3d0');
    doc.fontSize(8).fillColor('#065f46');
    doc.text('Total em investimentos', margin + 6, doc.y + 3, { width: colW.name });
    doc.text(formatBRLFromNumber(totalValue), margin + colW.name + colW.type + colW.profitability + 6, doc.y + 3, { width: colW.value - 6, align: 'right' });
    doc.y += rowHeight + 14;
  } else {
    doc.y = ensure(margin, 50);
    doc.rect(margin, doc.y - 2, 4, 14).fill(DARK_BLUE);
    doc.fontSize(11).fillColor(DARK_BLUE).text('Composição da Carteira', margin + 12, doc.y, { continued: false });
    doc.y += 14;
    if (!hasAccounts && !hasCards) {
      doc.fontSize(10).fillColor('#555555').text(
        'Nenhum dado de portfólio encontrado (contas, cartões ou investimentos). Os dados refletem as informações disponíveis na plataforma no momento da geração.',
        margin, doc.y, { width: pageW }
      );
    } else {
      doc.fontSize(10).fillColor('#555555').text(
        'Nenhum ativo de investimento encontrado para este cliente no momento da geração do relatório.',
        margin, doc.y, { width: pageW }
      );
    }
    doc.y += 28;
  }

  // -------- Disclaimer + footer (sample style: yellow box, then centered footer) --------
  const disclaimerY = ensure(margin, 88);
  doc.y = disclaimerY;
  doc.rect(margin, doc.y, pageW, 72).fill(YELLOW_BG).stroke('#e5e7eb');
  doc.fontSize(8).fillColor('#374151').text(
    'Disclaimer: As informações deste relatório são baseadas nos dados disponíveis na plataforma no momento da geração. Rentabilidades passadas não garantem resultados futuros. Os valores e projeções podem variar conforme o cenário de mercado. Este documento é confidencial e destinado exclusivamente ao investidor.',
    margin + 10, doc.y + 8, { width: pageW - 20, align: 'left' }
  );
  const footerY = doc.y + 78;
  doc.fontSize(10).fillColor('#1e3a5f').text(company + ' | Assessoria de Investimentos', margin, footerY, { width: pageW, align: 'center' });
  doc.fontSize(8).fillColor('#64748b').text('Este relatório é confidencial e destinado exclusivamente ao investidor.', margin, footerY + 12, { width: pageW, align: 'center' });
  doc.fontSize(8).fillColor('#94a3b8').text(`© ${new Date().getFullYear()} ${company}. Todos os direitos reservados.`, margin, footerY + 24, { width: pageW, align: 'center' });
}

/**
 * Build a PDF buffer for a report. Content by type:
 * - portfolio_analysis: Financial summary, accounts, cards, investment composition, transaction and investment history.
 * - financial_planning: Complete client portfolio plus planning section (objectives and recommendations) for follow-up meetings.
 * - monthly: Period summary (income, expenses, balance) and transaction table for the selected interval.
 * - custom: Same consolidated view as client: summary, accounts, cards, investments, and recent transactions.
 */
export async function buildReportPdf(options: {
  reportType: string;
  createdAt: string;
  dateRange?: string;
  params?: Record<string, unknown>;
  transactions?: TransactionRow[];
  portfolioPayload?: PortfolioReportPayload | null;
  /** When true, draw a diagonal watermark on every page. */
  watermark?: boolean;
  /** Text to show in the watermark (e.g. consultant name or "CONFIDENCIAL"). Used when watermark is true. */
  watermarkText?: string;
}): Promise<Buffer> {
  const { reportType, createdAt, dateRange, params, transactions = [], portfolioPayload, watermark, watermarkText } = options;
  const typeLabel = (params?.reportLabel as string) || REPORT_TYPE_LABELS[reportType] || reportType;
  const wmText = (watermark && watermarkText) ? watermarkText : undefined;

  const portfolioReportTypes = ['portfolio_analysis', 'consolidated', 'financial_planning', 'custom'];
  const reportDescriptions: Record<string, string> = {
    portfolio_analysis: 'Resumo financeiro, contas, cartões, composição de investimentos e histórico de transações e investimentos.',
    financial_planning: 'Portfólio completo do cliente e seção de planejamento com objetivos e recomendações para reuniões de acompanhamento.',
    custom: 'Visão consolidada: resumo, contas, cartões, investimentos e transações recentes.',
    consolidated: 'Visão consolidada do portfólio do cliente.',
  };
  if (portfolioReportTypes.includes(reportType) && portfolioPayload) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const title = (params?.reportLabel as string) || typeLabel;
    const reportDescription = reportDescriptions[reportType];
    drawPortfolioReportFromData(doc, portfolioPayload, title, {
      ...(wmText ? { watermarkText: wmText } : {}),
      ...(reportDescription ? { reportDescription } : {}),
    });
    if (reportType === 'financial_planning' && portfolioPayload) {
      const pageW = 612 - 100;
      const margin = 50;
      doc.addPage({ size: 'A4', margin: 50 });
      if (wmText) drawWatermark(doc, wmText);
      doc.y = 60;
      doc.fontSize(14).fillColor('#1e3a5f').text('Planejamento Financeiro', margin, doc.y, { continued: false });
      doc.fontSize(9).fillColor('#64748b').text(`Cliente: ${portfolioPayload.clientName} • ${portfolioPayload.reportDate}`, margin, doc.y + 18, { continued: false });
      doc.moveTo(margin, doc.y + 28).lineTo(margin + pageW, doc.y + 28).strokeColor('#e5e7eb').stroke();
      let planY = doc.y + 38;

      // -------- Resumo do portfólio (recap so the planning section is self-contained) --------
      const totalValue = portfolioPayload.totalValue ?? portfolioPayload.investments.reduce((s, i) => s + Number(i.current_value || 0), 0);
      const totalCash = portfolioPayload.cashBalance ?? (portfolioPayload.accounts?.reduce((s, a) => s + a.balance, 0) ?? 0);
      const totalDebt = portfolioPayload.totalDebt ?? (portfolioPayload.creditCards?.reduce((s, c) => s + c.balance, 0) ?? 0);
      const hasInv = portfolioPayload.investments.length > 0;
      const avgProfitability = hasInv && totalValue > 0 && portfolioPayload.investments.some((i) => i.profitability != null)
        ? portfolioPayload.investments.reduce((s, i) => s + Number(i.current_value || 0) * (i.profitability != null ? Number(i.profitability) : 0), 0) / totalValue
        : null;

      doc.y = planY;
      doc.fillColor('#dbeafe').rect(margin, doc.y, pageW, 18).fill();
      doc.rect(margin, doc.y, 4, 18).fill(DARK_BLUE);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a5f').text('Resumo do portfólio do cliente', margin + 12, doc.y + 5, { continued: false });
      doc.font('Helvetica');
      doc.y += 26;
      const gap = 8;
      const cardW = (pageW - gap * 3) / 4;
      const boxH = 40;
      const cardY = doc.y;
      const planMetrics = [
        { label: 'Patrimônio em investimentos', value: hasInv ? formatBRLFromNumber(totalValue) : 'R$ 0,00', bg: '#eff6ff' },
        { label: 'Rentabilidade média', value: avgProfitability != null ? `CDI + ${avgProfitability.toFixed(2)}%` : '—', bg: '#ecfdf5' },
        { label: 'Saldo em contas', value: formatBRLFromNumber(totalCash), bg: '#eef2ff' },
        { label: 'Dívida (cartões)', value: formatBRLFromNumber(totalDebt), bg: '#fffbeb' },
      ];
      for (let i = 0; i < planMetrics.length; i++) {
        const x = margin + i * (cardW + gap);
        doc.fillColor(planMetrics[i].bg).rect(x, cardY, cardW, boxH).fill();
        doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(x, cardY, cardW, boxH).stroke();
        doc.fontSize(7).fillColor('#64748b').text(planMetrics[i].label.toUpperCase(), x + 8, cardY + 6, { width: cardW - 12 });
        doc.fontSize(10).fillColor('#1e3a5f').text(planMetrics[i].value, x + 8, cardY + 22, { width: cardW - 12 });
      }
      doc.y = cardY + boxH + 20;

      // -------- Objetivos --------
      doc.fillColor('#dbeafe').rect(margin, doc.y, pageW, 18).fill();
      doc.rect(margin, doc.y, 4, 18).fill(DARK_BLUE);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a5f').text('Objetivos', margin + 12, doc.y + 5, { continued: false });
      doc.font('Helvetica');
      doc.y += 26;
      doc.fontSize(10).fillColor('#374151').text(
        'Este relatório consolida a visão atual do portfólio do cliente. Recomenda-se definir objetivos de curto, médio e longo prazo em conjunto com o investidor e revisar a alocação periodicamente. Utilize esta seção para registrar os objetivos acordados nas reuniões de acompanhamento.',
        margin, doc.y, { width: pageW, align: 'left' }
      );
      doc.y += 48;

      // -------- Recomendações --------
      doc.fillColor('#dbeafe').rect(margin, doc.y, pageW, 18).fill();
      doc.rect(margin, doc.y, 4, 18).fill(DARK_BLUE);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a5f').text('Recomendações', margin + 12, doc.y + 5, { continued: false });
      doc.font('Helvetica');
      doc.y += 26;
      doc.fontSize(10).fillColor('#374151').text(
        'As informações de contas, cartões e investimentos refletem os dados disponíveis na plataforma. Utilize este documento como base para as reuniões de acompanhamento e para propor ajustes conforme o perfil e os objetivos do cliente.',
        margin, doc.y, { width: pageW, align: 'left' }
      );
    }
    doc.end();
    return streamToBuffer(doc);
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

    if (wmText) drawWatermark(doc, wmText);

    const pageW = 612 - 100;
    const colW = { date: 70, desc: pageW - 70 - 70 - 80, category: 70, amount: 80 };

    doc.fontSize(22).text('zurT — Relatório Financeiro', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(14).text(typeLabel, { continued: false });
    if (reportType === 'monthly') {
      doc.fontSize(9).fillColor('#64748b').text('Resumo do período (receitas, despesas, saldo) e tabela de movimentações do intervalo selecionado.', { continued: false });
    }
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#666666').text(`Gerado em ${createdAt}`, { continued: false });
    if (dateRange) {
      const periodLabel =
        dateRange === 'last-month'
          ? 'Último mês'
          : dateRange === 'last-3-months'
            ? 'Últimos 3 meses'
            : dateRange === 'last-6-months'
              ? 'Últimos 6 meses'
              : dateRange === 'last-year'
                ? 'Último ano'
                : dateRange === 'current-month'
                  ? 'Mês atual'
                  : dateRange;
      doc.fontSize(10).text(`Período: ${periodLabel}`, { continued: false });
    }
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(1);

    doc.fontSize(11).fillColor('#1f2937').text('Resumo', { continued: false });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#374151').text(
      'Este relatório foi gerado pela plataforma zurT. Os dados refletem as informações disponíveis no momento da geração.',
      { align: 'left', width: pageW }
    );
    doc.moveDown(0.6);

    if (reportType === 'monthly') {
    doc.moveDown(1);
      doc.fontSize(12).fillColor('#111827').text('Resumo do período', { continued: false });
      doc.moveDown(0.3);
      const sectionY = doc.y;
      doc.moveTo(50, sectionY).lineTo(562, sectionY).strokeColor('#d1d5db').stroke();
      doc.moveDown(0.5);
      const margin = 50;
      if (transactions.length > 0) {
        const receitas = transactions.filter((t) => t.amount_cents > 0).reduce((s, t) => s + t.amount_cents, 0);
        const despesas = transactions.filter((t) => t.amount_cents < 0).reduce((s, t) => s + Math.abs(t.amount_cents), 0);
        const saldo = receitas - despesas;
        doc.fontSize(10).fillColor('#374151');
        doc.text(`Total de receitas: ${formatBRL(receitas)}`, margin, doc.y, { continued: false });
        doc.text(`Total de despesas: ${formatBRL(-despesas)}`, margin, doc.y + 14, { continued: false });
        doc.fontSize(10).fillColor(saldo >= 0 ? '#166534' : '#b91c1c');
        doc.text(`Saldo do período: ${formatBRL(saldo)}`, margin, doc.y + 28, { continued: false });
        doc.y += 44;
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#1f2937').text('Movimentações', { continued: false });
        doc.moveDown(0.3);
        const tableWidth = 512;
        const txColW = { date: 58, desc: tableWidth - 58 - 52 - 78, category: 52, amount: 78 };
        const rowHeight = 10;
        const headerHeight = 14;
        const bottomY = 720;
        const drawTxHeader = (y: number) => {
          doc.fillColor('#e5e7eb').strokeColor('#d1d5db');
          doc.rect(margin, y, tableWidth, headerHeight).fillAndStroke();
          doc.fontSize(8).fillColor('#374151');
          doc.text('Data', margin + 5, y + 4, { width: txColW.date - 4 });
          doc.text('Descrição', margin + txColW.date + 5, y + 4, { width: txColW.desc - 4 });
          doc.text('Categoria', margin + txColW.date + txColW.desc + 5, y + 4, { width: txColW.category - 4 });
          doc.text('Valor', margin + txColW.date + txColW.desc + txColW.category + 5, y + 4, { width: txColW.amount - 6, align: 'right' });
          return y + headerHeight;
        };
        let tableY = doc.y;
        tableY = drawTxHeader(tableY);
        doc.y = tableY;
        const monthlyRows = transactions.slice(0, 500);
        for (let i = 0; i < monthlyRows.length; i++) {
          const row = monthlyRows[i];
          if (doc.y + rowHeight > bottomY) {
            doc.addPage({ size: 'A4', margin: 50 });
            if (wmText) drawWatermark(doc, wmText);
            doc.y = 50;
            tableY = drawTxHeader(doc.y);
            doc.y = tableY;
          }
          const desc = (row.description || row.merchant || '—').slice(0, 48);
          const cat = (row.category || '—').slice(0, 14);
          const amountStr = formatBRL(row.amount_cents);
          const isNegative = row.amount_cents < 0;
          const rowY = doc.y;
          if (i % 2 === 1) {
            doc.fillColor('#f9fafb');
            doc.rect(margin, rowY, tableWidth, rowHeight).fill();
          }
          doc.strokeColor('#e5e7eb');
          doc.rect(margin, rowY, tableWidth, rowHeight).stroke();
          doc.fontSize(8).fillColor(isNegative ? '#b91c1c' : '#374151');
          doc.text(formatDate(row.occurred_at), margin + 4, rowY + 2, { width: txColW.date - 4 });
          doc.text(desc, margin + txColW.date + 4, rowY + 2, { width: txColW.desc - 4 });
          doc.text(cat, margin + txColW.date + txColW.desc + 4, rowY + 2, { width: txColW.category - 4 });
          doc.text(amountStr, margin + txColW.date + txColW.desc + txColW.category + 4, rowY + 2, { width: txColW.amount - 4, align: 'right' });
          doc.y = rowY + rowHeight;
        }
        doc.moveDown(0.8);
        const footerBoxY = doc.y;
        const footerBoxH = 36;
        doc.fillColor('#f9fafb').strokeColor('#e5e7eb');
        doc.rect(margin, footerBoxY, tableWidth, footerBoxH).fillAndStroke();
        doc.fontSize(9).fillColor('#374151').text(
          `Total: ${transactions.length} transação(ões) no período.`,
          margin + 10, footerBoxY + 8, { width: tableWidth - 20 }
        );
        doc.fontSize(8).fillColor('#6b7280').text(
          'Documento gerado automaticamente por zurT. Para dúvidas, acesse a plataforma.',
          margin + 10, footerBoxY + 22, { width: tableWidth - 20 }
        );
        doc.y = footerBoxY + footerBoxH + 12;
      } else {
        doc.fontSize(10).fillColor('#6b7280').text(
          'Nenhuma movimentação encontrada no período selecionado ou não há dados sincronizados.',
          margin, doc.y, { width: 512 }
        );
        doc.y += 24;
      }
    } else if (reportType === 'transactions' && transactions.length > 0) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#111827').text('Transações', { continued: false });
      doc.moveDown(0.3);
      const sectionY = doc.y;
      doc.moveTo(50, sectionY).lineTo(562, sectionY).strokeColor('#d1d5db').stroke();
      doc.moveDown(0.5);

      const margin = 50;
      const tableWidth = 512;
      const txColW = { date: 58, desc: tableWidth - 58 - 52 - 78, category: 52, amount: 78 };
      const rowHeight = 10;
      const headerHeight = 14;
      const bottomY = 720;

      const drawTransactionTableHeader = (y: number) => {
        doc.fillColor('#e5e7eb').strokeColor('#d1d5db');
        doc.rect(margin, y, tableWidth, headerHeight).fillAndStroke();
        doc.fontSize(8).fillColor('#374151');
        doc.text('Data', margin + 5, y + 4, { width: txColW.date - 4 });
        doc.text('Descrição', margin + txColW.date + 5, y + 4, { width: txColW.desc - 4 });
        doc.text('Categoria', margin + txColW.date + txColW.desc + 5, y + 4, { width: txColW.category - 4 });
        doc.text('Valor', margin + txColW.date + txColW.desc + txColW.category + 5, y + 4, { width: txColW.amount - 6, align: 'right' });
        return y + headerHeight;
      };

      let tableY = doc.y;
      tableY = drawTransactionTableHeader(tableY);
      doc.y = tableY;

      for (let i = 0; i < transactions.length; i++) {
        const row = transactions[i];
        if (doc.y + rowHeight > bottomY) {
          doc.addPage({ size: 'A4', margin: 50 });
          if (wmText) drawWatermark(doc, wmText);
          doc.y = 50;
          tableY = drawTransactionTableHeader(doc.y);
          doc.y = tableY;
        }
        const desc = (row.description || row.merchant || '—').slice(0, 48);
        const cat = (row.category || '—').slice(0, 14);
        const amountStr = formatBRL(row.amount_cents);
        const isNegative = row.amount_cents < 0;
        const rowY = doc.y;
        if (i % 2 === 1) {
          doc.fillColor('#f9fafb');
          doc.rect(margin, rowY, tableWidth, rowHeight).fill();
        }
        doc.strokeColor('#e5e7eb');
        doc.rect(margin, rowY, tableWidth, rowHeight).stroke();
        doc.fontSize(8).fillColor(isNegative ? '#b91c1c' : '#374151');
        doc.text(formatDate(row.occurred_at), margin + 4, rowY + 2, { width: txColW.date - 4 });
        doc.text(desc, margin + txColW.date + 4, rowY + 2, { width: txColW.desc - 4 });
        doc.text(cat, margin + txColW.date + txColW.desc + 4, rowY + 2, { width: txColW.category - 4 });
        doc.text(amountStr, margin + txColW.date + txColW.desc + txColW.category + 4, rowY + 2, { width: txColW.amount - 4, align: 'right' });
        doc.y = rowY + rowHeight;
      }

      doc.moveDown(0.8);
      const footerBoxY = doc.y;
      const footerBoxH = 36;
      doc.fillColor('#f9fafb').strokeColor('#e5e7eb');
      doc.rect(margin, footerBoxY, tableWidth, footerBoxH).fillAndStroke();
      doc.fontSize(9).fillColor('#374151').text(
        `Total: ${transactions.length} transação(ões) no período.`,
        margin + 10, footerBoxY + 8, { width: tableWidth - 20 }
      );
      doc.fontSize(8).fillColor('#6b7280').text(
        'Documento gerado automaticamente por zurT. Para dúvidas, acesse a plataforma.',
        margin + 10, footerBoxY + 22, { width: tableWidth - 20 }
      );
      doc.y = footerBoxY + footerBoxH + 12;
    } else if (reportType === 'transactions' && transactions.length === 0) {
      doc.moveDown(1.5);
      doc.fontSize(12).fillColor('#000000').text('Transações', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666').text(
        'Nenhuma transação encontrada no período selecionado ou não há dados sincronizados.',
        { align: 'left', width: 500 }
      );
    }

    const hasOwnFooter = (reportType === 'transactions' && transactions.length > 0) || (reportType === 'monthly' && transactions.length > 0);
    if (!hasOwnFooter) {
    doc.moveDown(3);
    doc.fontSize(9).fillColor('#999999').text(
      '— Documento gerado automaticamente por zurT. Para dúvidas, acesse a plataforma.',
      { align: 'center' }
    );
    }

  doc.end();
  return streamToBuffer(doc);
}
