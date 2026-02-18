/**
 * Auto-categorize transactions based on merchant name / description keywords.
 * Returns a category string or null (falls back to "Others" in the frontend).
 */

const MERCHANT_CATEGORY_MAP: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: ['uber', '99', 'cabify', 'lyft', 'taxi', 'gasolina', 'shell', 'ipiranga', 'br distribuidora', 'posto', 'estacionamento', 'parking', 'pedágio', 'pedagio'],
    category: 'Transport',
  },
  {
    keywords: ['ifood', 'rappi', 'mcdonald', 'burger', 'pizza', 'starbucks', 'padaria', 'restaurante', 'sushi', 'café', 'lanchonete', 'food', 'açaí', 'acai', 'mercado', 'supermercado', 'carrefour', 'pão de açúcar', 'extra'],
    category: 'Food',
  },
  {
    keywords: ['amazon', 'mercado livre', 'shopee', 'shein', 'magalu', 'magazine luiza', 'casas bahia', 'americanas', 'aliexpress', 'shopping', 'loja', 'store'],
    category: 'Shopping',
  },
  {
    keywords: ['netflix', 'spotify', 'disney', 'hbo', 'prime video', 'apple tv', 'youtube', 'deezer', 'cinema', 'teatro', 'ingresso', 'game', 'steam', 'playstation', 'xbox'],
    category: 'Entertainment',
  },
  {
    keywords: ['aluguel', 'condominio', 'condomínio', 'imobiliaria', 'imobiliária', 'rent', 'mortgage', 'hipoteca'],
    category: 'Housing',
  },
  {
    keywords: ['enel', 'cemig', 'cpfl', 'sabesp', 'comgas', 'comgás', 'claro', 'vivo', 'tim', 'oi', 'internet', 'energia', 'água', 'agua', 'luz', 'gas', 'gás', 'telefone', 'celular'],
    category: 'Utilities',
  },
  {
    keywords: ['farmacia', 'farmácia', 'drogaria', 'droga raia', 'pague menos', 'hospital', 'médico', 'medico', 'clinica', 'clínica', 'saúde', 'saude', 'plano de saude', 'unimed', 'amil', 'sulamerica', 'dentista', 'laboratorio'],
    category: 'Health',
  },
  {
    keywords: ['escola', 'faculdade', 'universidade', 'curso', 'udemy', 'coursera', 'mensalidade escolar', 'educação', 'educacao', 'livro', 'book'],
    category: 'Education',
  },
  {
    keywords: ['pix', 'ted', 'doc', 'transferencia', 'transferência'],
    category: 'Transfer',
  },
  {
    keywords: ['salario', 'salário', 'salary', 'wages', 'freelance', 'pagamento recebido', 'depósito', 'deposito'],
    category: 'Income',
  },
  {
    keywords: ['assinatura', 'subscription', 'recorrente', 'mensalidade'],
    category: 'Subscriptions',
  },
  {
    keywords: ['hotel', 'airbnb', 'booking', 'decolar', 'viagem', 'passagem', 'airline', 'gol linhas', 'latam', 'azul linhas', 'trip'],
    category: 'Travel',
  },
];

export function autoCategorize(merchant: string | null, description: string | null): string | null {
  const text = `${merchant || ''} ${description || ''}`.toLowerCase();
  if (!text.trim()) return null;

  for (const entry of MERCHANT_CATEGORY_MAP) {
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) {
        return entry.category;
      }
    }
  }

  return null;
}
