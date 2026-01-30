import { createRequire } from 'module';
import { Writable } from 'stream';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

const REPORT_TYPE_LABELS: Record<string, string> = {
  consolidated: 'Relatório Consolidado',
  transactions: 'Extrato de Transações',
  portfolio_analysis: 'Evolução de Investimentos',
  monthly: 'Relatório Mensal',
  monthly_evolution: 'Relatório Mensal',
  advisor_custom: 'Relatório Personalizado',
  financial_planning: 'Planejamento Financeiro',
  custom: 'Relatório Customizado',
};

export type TransactionRow = {
  occurred_at: Date | string;
  description: string | null;
  merchant: string | null;
  category: string | null;
  amount_cents: number;
  currency: string;
  account_name?: string | null;
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

/**
 * Build a PDF buffer for a report with title, type, date and optional transaction data.
 * Uses pipe to a Writable to collect chunks so the buffer is never empty.
 */
export function buildReportPdf(options: {
  reportType: string;
  createdAt: string;
  dateRange?: string;
  params?: Record<string, unknown>;
  transactions?: TransactionRow[];
}): Promise<Buffer> {
  const { reportType, createdAt, dateRange, params, transactions = [] } = options;
  const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const collector = new Writable({
      write(chunk: Buffer, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    collector.on('finish', () => resolve(Buffer.concat(chunks)));
    collector.on('error', reject);
    doc.on('error', reject);
    doc.pipe(collector);

    const pageW = 612 - 100;
    const colW = { date: 70, desc: pageW - 70 - 70 - 80, category: 70, amount: 80 };

    doc.fontSize(22).text('zurT — Relatório Financeiro', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(14).text(typeLabel, { continued: false });
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#666666').text(`Gerado em ${createdAt}`, { continued: false });
    if (dateRange) {
      doc.fontSize(10).text(`Período: ${dateRange}`, { continued: false });
    }
    doc.moveDown(2);

    doc.fontSize(12).fillColor('#000000').text('Resumo', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(
      'Este relatório foi gerado pela plataforma zurT. Os dados refletem as informações disponíveis no momento da geração.',
      { align: 'left', width: 500 }
    );
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#666666').text(
      `Tipo: ${typeLabel} | Parâmetros: ${params && Object.keys(params).length ? JSON.stringify(params) : 'Nenhum'}`,
      { align: 'left', width: 500 }
    );

    if (reportType === 'transactions' && transactions.length > 0) {
      doc.moveDown(1.5);
      doc.fontSize(12).fillColor('#000000').text('Transações', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(9).fillColor('#333333');
      doc.text('Data', 50, doc.y, { width: colW.date });
      doc.text('Descrição', 50 + colW.date, doc.y, { width: colW.desc });
      doc.text('Categoria', 50 + colW.date + colW.desc, doc.y, { width: colW.category });
      doc.text('Valor', 50 + colW.date + colW.desc + colW.category, doc.y, { width: colW.amount });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).stroke('#cccccc');
      doc.moveDown(0.4);

      const rowHeight = 14;
      const bottomY = 700;
      for (const row of transactions) {
        if (doc.y > bottomY) {
          doc.addPage({ size: 'A4', margin: 50 });
          doc.y = 50;
        }
        const desc = (row.description || row.merchant || '—').slice(0, 40);
        const cat = (row.category || '—').slice(0, 12);
        const amountStr = formatBRL(row.amount_cents);
        const isNegative = row.amount_cents < 0;
        doc.fontSize(8).fillColor(isNegative ? '#990000' : '#333333');
        doc.text(formatDate(row.occurred_at), 50, doc.y, { width: colW.date });
        doc.text(desc, 50 + colW.date, doc.y, { width: colW.desc });
        doc.text(cat, 50 + colW.date + colW.desc, doc.y, { width: colW.category });
        doc.text(amountStr, 50 + colW.date + colW.desc + colW.category, doc.y, { width: colW.amount, align: 'right' });
        doc.y += rowHeight;
      }

      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#666666').text(
        `Total: ${transactions.length} transação(ões) no período.`,
        { continued: false }
      );
    } else if (reportType === 'transactions' && transactions.length === 0) {
      doc.moveDown(1.5);
      doc.fontSize(12).fillColor('#000000').text('Transações', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666').text(
        'Nenhuma transação encontrada no período selecionado ou não há dados sincronizados.',
        { align: 'left', width: 500 }
      );
    }

    doc.moveDown(3);
    doc.fontSize(9).fillColor('#999999').text(
      '— Documento gerado automaticamente por zurT. Para dúvidas, acesse a plataforma.',
      { align: 'center' }
    );

    doc.end();
  });
}
