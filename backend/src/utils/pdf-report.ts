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

/** Ensure we have room for at least needed pt; if not, add a new page. Returns current doc.y (top of new page if added). */
function ensureSpace(doc: any, margin: number, needed: number): number {
  if (doc.y + needed > BOTTOM_Y) {
    doc.addPage({ size: 'A4', margin });
    return margin;
  }
  return doc.y;
}

/** Draw portfolio report from DB-driven payload. No fixed page count; sections only if data exists; pagination by content. */
function drawPortfolioReportFromData(doc: any, data: PortfolioReportPayload) {
  const margin = 50;
  const pageW = 612 - margin * 2;
  const company = data.companyName || 'zurT';
  const totalValue = data.totalValue ?? data.investments.reduce((s, i) => s + Number(i.current_value || 0), 0);
  const hasInvestments = data.investments.length > 0;

  // -------- Header (first page) --------
  doc.fontSize(10).fillColor('#333333');
  doc.text(company.toUpperCase(), margin, 50, { continued: false });
  doc.fontSize(8).fillColor('#666666').text('Relatório de Portfólio', margin, 62, { continued: false });

  doc.fontSize(14).fillColor('#1a1a1a').text('Relatório de Portfólio', 612 - margin - 200, 50, { width: 200, align: 'right' });
  doc.fontSize(9).fillColor('#555555').text(`Data: ${data.reportDate}`, 612 - margin - 200, 66, { width: 200, align: 'right' });
  doc.text(`Cliente: ${data.clientName}`, 612 - margin - 200, 76, { width: 200, align: 'right' });

  let y = 95;

  // -------- Summary (only when we have investment data) --------
  if (hasInvestments && totalValue >= 0) {
    doc.fontSize(10).fillColor('#666666').text('Patrimônio em investimentos', margin, y, { continued: false });
    doc.fontSize(14).fillColor('#1a1a1a').text(formatBRLFromNumber(totalValue), margin, y + 12, { continued: false });
    doc.fontSize(9).fillColor('#777777').text(`${data.investments.length} ativo(s) na carteira`, margin, y + 30, { continued: false });
    y += 46;
    if (data.cashBalance != null && data.cashBalance !== 0) {
      doc.fontSize(9).fillColor('#555555').text(`Saldo em conta: ${formatBRLFromNumber(data.cashBalance)}`, margin, y, { continued: false });
      y += 14;
    }
    if (data.totalDebt != null && data.totalDebt !== 0) {
      doc.fontSize(9).fillColor('#555555').text(`Dívida (cartões/empréstimos): ${formatBRLFromNumber(data.totalDebt)}`, margin, y, { continued: false });
      y += 14;
    }
    y += 8;
  }

  // -------- Composition table (only when we have investments) --------
  if (hasInvestments) {
    y = ensureSpace(doc, margin, 80);
    doc.fontSize(11).fillColor(DARK_BLUE).text('Composição da Carteira', margin, y, { continued: false });
    y += 8;
    doc.moveTo(margin, y).lineTo(margin + pageW, y).stroke('#cccccc');
    y += 10;

    const colW = { name: 220, type: 100, profitability: 90, value: 100 };
    const tableW = colW.name + colW.type + colW.profitability + colW.value;
    doc.rect(margin, y, tableW, 16).fill(LIGHT_BLUE).stroke();
    doc.fontSize(8).fillColor('#333333');
    doc.text('PRODUTO', margin + 4, y + 5, { width: colW.name });
    doc.text('TIPO', margin + colW.name + 4, y + 5, { width: colW.type });
    doc.text('RENTABILIDADE', margin + colW.name + colW.type + 4, y + 5, { width: colW.profitability });
    doc.text('VALOR (R$)', margin + colW.name + colW.type + colW.profitability + 4, y + 5, { width: colW.value });
    y += 18;
    doc.y = y;

    const rowHeight = 14;
    for (const row of data.investments) {
      const drawY = ensureSpace(doc, margin, rowHeight + 4);
      doc.y = drawY;
      doc.fontSize(8).fillColor('#333333');
      const name = (row.name || '—').slice(0, 45);
      const type = (row.type || '—').slice(0, 18);
      const prof = row.profitability != null ? `${Number(row.profitability).toFixed(2)}%` : '—';
      const valueStr = formatBRLFromNumber(Number(row.current_value || 0));
      doc.text(name, margin + 4, doc.y + 3, { width: colW.name });
      doc.text(type, margin + colW.name + 4, doc.y + 3, { width: colW.type });
      doc.text(prof, margin + colW.name + colW.type + 4, doc.y + 3, { width: colW.profitability });
      doc.text(valueStr, margin + colW.name + colW.type + colW.profitability + 4, doc.y + 3, { width: colW.value });
      doc.y += rowHeight;
    }
    doc.y += 14;
  } else {
    doc.fontSize(11).fillColor(DARK_BLUE).text('Composição da Carteira', margin, y, { continued: false });
    y += 10;
    doc.fontSize(10).fillColor('#555555').text(
      'Nenhum ativo de investimento encontrado para este cliente no momento da geração do relatório. Os dados refletem as informações disponíveis na plataforma.',
      margin, y, { width: pageW }
    );
    doc.y = y + 28;
  }

  // -------- Disclaimer + footer (new page if not enough room) --------
  const disclaimerY = ensureSpace(doc, margin, 100);
  doc.y = disclaimerY;
  doc.rect(margin, doc.y, pageW, 58).fill(YELLOW_BG).stroke('#e0e0e0');
  doc.fontSize(8).fillColor('#333333').text(
    'Disclaimer: As informações deste relatório são baseadas nos dados disponíveis na plataforma no momento da geração. Rentabilidades passadas não garantem resultados futuros. Este documento é confidencial e destinado exclusivamente ao investidor.',
    margin + 8, doc.y + 6, { width: pageW - 16, align: 'left' }
  );
  const footerY = Math.min(792 - margin - 42, doc.y + 68);
  doc.fontSize(9).fillColor('#1a1a1a').text(company + ' | Assessoria de Investimentos', margin, footerY, { width: pageW, align: 'center' });
  doc.fontSize(8).fillColor('#555555').text('Este relatório é confidencial e destinado exclusivamente ao investidor.', margin, footerY + 10, { width: pageW, align: 'center' });
  doc.text(`© ${new Date().getFullYear()} ${company}. Todos os direitos reservados.`, margin, footerY + 20, { width: pageW, align: 'center' });
}

/**
 * Build a PDF buffer for a report. For portfolio_analysis, content is driven by portfolioPayload (from DB); no fixed page count.
 */
export async function buildReportPdf(options: {
  reportType: string;
  createdAt: string;
  dateRange?: string;
  params?: Record<string, unknown>;
  transactions?: TransactionRow[];
  portfolioPayload?: PortfolioReportPayload | null;
}): Promise<Buffer> {
  const { reportType, createdAt, dateRange, params, transactions = [], portfolioPayload } = options;
  const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType;

  if (reportType === 'portfolio_analysis' && portfolioPayload) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    drawPortfolioReportFromData(doc, portfolioPayload);
    doc.end();
    return streamToBuffer(doc);
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const pageW = 612 - 100;
    const colW = { date: 70, desc: pageW - 70 - 70 - 80, category: 70, amount: 80 };

    doc.fontSize(22).text('zurT — Relatório Financeiro', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(14).text(typeLabel, { continued: false });
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
