import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { buildReportPdf } from '../utils/pdf-report.js';

/** Minimal valid PDF with one line of text when pdfkit is not available. Builds xref with correct byte offsets. */
function getFallbackPdfBuffer(reportType: string, createdAt: string): Buffer {
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
    'xref',
    '0 6',
    '0000000000 65535 f ',
    `${String(off1).padStart(10, '0')} 00000 n `,
    `${String(off2).padStart(10, '0')} 00000 n `,
    `${String(off3).padStart(10, '0')} 00000 n `,
    `${String(off4).padStart(10, '0')} 00000 n `,
    `${String(off5).padStart(10, '0')} 00000 n `,
    'trailer<</Size 6/Root 1 0 R>>',
    'startxref',
    String(xrefStart),
    '%%EOF',
  ].join('\n');
  lines.push(xref);
  return Buffer.from(lines.join(''), 'utf8');
}

export async function reportsRoutes(fastify: FastifyInstance) {
  // Get user's reports
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      // Check if reports table exists
      let hasReports = false;
      try {
        await db.query('SELECT 1 FROM reports LIMIT 1');
        hasReports = true;
      } catch {}

      if (!hasReports) {
        return reply.send({ reports: [] });
      }

      const result = await db.query(
        `SELECT 
          id,
          type,
          params_json,
          file_url,
          created_at
        FROM reports
        WHERE owner_user_id = $1
        ORDER BY created_at DESC`,
        [userId]
      );

      const reports = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        generatedAt: new Date(row.created_at).toLocaleDateString('pt-BR'),
        status: row.file_url ? 'generated' : 'pending',
        downloadUrl: row.file_url,
      }));

      return reply.send({ reports });
    } catch (error: any) {
      fastify.log.error('Error fetching reports:', error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ reports: [] });
    }
  });

  // Generate report
  fastify.post('/generate', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { type, dateRange, params } = request.body as any;

      if (!type) {
        return reply.code(400).send({ error: 'Report type is required' });
      }

      // Check if reports table exists
      let hasReports = false;
      try {
        await db.query('SELECT 1 FROM reports LIMIT 1');
        hasReports = true;
      } catch {}

      if (!hasReports) {
        return reply.code(503).send({ 
          error: 'Service temporarily unavailable',
          message: 'Report generation is currently unavailable. Please try again later.'
        });
      }

      // Create report record
      const result = await db.query(
        `INSERT INTO reports (owner_user_id, target_user_id, type, params_json)
         VALUES ($1, $1, $2, $3)
         RETURNING id, created_at`,
        [userId, type, JSON.stringify({ dateRange, ...params })]
      );

      // TODO: Actually generate PDF report here
      // For now, we'll just return the report record

      return reply.send({
        report: {
          id: result.rows[0].id,
          type,
          generatedAt: new Date(result.rows[0].created_at).toLocaleDateString('pt-BR'),
          status: 'generated',
        },
        message: 'Relatório gerado. Use o botão Baixar para obter o PDF.',
      });
    } catch (error: any) {
      fastify.log.error('Error generating report:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });

  // Delete a single report (owner only)
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params;

      const result = await db.query(
        'DELETE FROM reports WHERE id = $1 AND owner_user_id = $2 RETURNING id',
        [id, userId]
      );

      if (!result.rows.length) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      return reply.send({ ok: true, message: 'Relatório removido.' });
    } catch (error: any) {
      fastify.log.error('Error deleting report:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Download report PDF (generated on-the-fly)
  fastify.get<{ Params: { id: string } }>('/:id/file', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params;

      const result = await db.query(
        `SELECT id, type, params_json, created_at FROM reports
         WHERE id = $1 AND owner_user_id = $2`,
        [id, userId]
      );

      if (!result.rows.length) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      const report = result.rows[0];
      const reportType = report.type;
      const createdAt = new Date(report.created_at).toLocaleDateString('pt-BR');
      const params = report.params_json && typeof report.params_json === 'object'
        ? report.params_json
        : typeof report.params_json === 'string'
          ? (() => { try { return JSON.parse(report.params_json); } catch { return {}; } })()
          : {};
      const dateRange = params?.dateRange as string | undefined;

      // Fetch transaction data for "Extrato de Transações" report (main table + Open Finance fallback)
      type TxRow = { occurred_at: Date; description: string | null; merchant: string | null; category: string | null; amount_cents: number; currency: string; account_name?: string | null };
      let transactions: TxRow[] = [];
      if (reportType === 'transactions') {
        const range = dateRange || 'last-year';
        const now = new Date();
        let fromDate: Date;
        if (range === 'last-month') {
          fromDate = new Date(now);
          fromDate.setMonth(fromDate.getMonth() - 1);
        } else if (range === 'last-3-months') {
          fromDate = new Date(now);
          fromDate.setMonth(fromDate.getMonth() - 3);
        } else {
          fromDate = new Date(now);
          fromDate.setFullYear(fromDate.getFullYear() - 1);
        }
        const fromStr = fromDate.toISOString().slice(0, 10);
        try {
          const hasTx = await db.query('SELECT 1 FROM transactions LIMIT 1').then(() => true).catch(() => false);
          if (hasTx) {
            const txResult = await db.query(
              `SELECT t.occurred_at, t.description, t.merchant, t.category, t.amount_cents, t.currency,
                      ba.display_name as account_name
               FROM transactions t
               LEFT JOIN bank_accounts ba ON t.account_id = ba.id
               WHERE t.user_id = $1 AND t.occurred_at >= $2
               ORDER BY t.occurred_at DESC
               LIMIT 500`,
              [userId, fromDate.toISOString()]
            );
            transactions = txResult.rows;
          }
        } catch (e) {
          fastify.log.warn('Could not load transactions for report: %s', (e as Error).message);
        }
        // Fallback: Open Finance (Pluggy) transactions if main table empty
        if (transactions.length === 0) {
          try {
            const hasPluggy = await db.query('SELECT 1 FROM pluggy_transactions LIMIT 1').then(() => true).catch(() => false);
            if (hasPluggy) {
              const ptResult = await db.query(
                `SELECT pt.date, pt.description, pt.merchant, pt.category, pt.amount, pa.name as account_name
                 FROM pluggy_transactions pt
                 LEFT JOIN pluggy_accounts pa ON pt.pluggy_account_id = pa.pluggy_account_id AND pt.user_id = pa.user_id
                 WHERE pt.user_id = $1 AND pt.date >= $2
                 ORDER BY pt.date DESC, pt.created_at DESC
                 LIMIT 500`,
                [userId, fromStr]
              );
              transactions = ptResult.rows.map((r: { date: string; description: string | null; merchant: string | null; category: string | null; amount: string | number; account_name?: string | null }) => ({
                occurred_at: new Date(r.date),
                description: r.description,
                merchant: r.merchant,
                category: r.category,
                amount_cents: Math.round(Number(r.amount) * 100),
                currency: 'BRL',
                account_name: r.account_name,
              }));
            }
          } catch (e) {
            fastify.log.warn('Could not load pluggy transactions for report: %s', (e as Error).message);
          }
        }
      }

      let pdf: Buffer;
      try {
        pdf = await buildReportPdf({
          reportType,
          createdAt,
          dateRange,
          params,
          transactions: transactions.length ? transactions : undefined,
        });
        if (!pdf || pdf.length === 0) {
          fastify.log.warn('PDFKit returned empty buffer, using fallback PDF');
          pdf = getFallbackPdfBuffer(reportType, createdAt);
        }
      } catch (err: any) {
        fastify.log.warn('PDFKit unavailable, using fallback PDF: %s', err?.message);
        pdf = getFallbackPdfBuffer(reportType, createdAt);
      }

      const filename = `relatorio-${reportType}-${createdAt.replace(/\//g, '-')}.pdf`;
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(pdf);
    } catch (error: any) {
      fastify.log.error('Error serving report file:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

