# Documentação do Schema - zurT

## Visão Geral

O schema do banco de dados foi projetado para suportar uma plataforma completa de consolidação financeira, incluindo:

- Gestão de usuários (clientes, consultores, administradores)
- Integração com Open Finance e B3
- Consolidação de contas bancárias, cartões e investimentos
- Sistema de planos e assinaturas
- CRM para consultores
- Alertas e notificações
- Relatórios personalizados

## Diagrama de Relações Principais

```
users
├── consultant_profiles (1:1)
├── customer_consultants (N:M - clientes ↔ consultores)
├── subscriptions (1:N)
├── connections (1:N)
├── bank_accounts (1:N)
├── transactions (1:N)
├── credit_cards (1:N)
├── holdings (1:N)
├── goals (1:N)
└── alerts (1:N)

connections
├── bank_accounts (1:N)
├── credit_cards (1:N)
└── holdings (1:N)

subscriptions
├── payments (1:N)
└── plans (N:1)

credit_cards
└── card_invoices (1:N)
    └── invoice_items (1:N)

assets
├── holdings (1:N)
├── b3_positions (1:N)
├── dividends (1:N)
└── corporate_events (1:N)
```

## Tabelas Principais

### 1. Usuários e Autenticação

#### `users`
Tabela central para todos os tipos de usuários (clientes, consultores, admins).

**Campos importantes:**
- `role`: Enum ('customer', 'consultant', 'admin')
- `password_hash`: Hash da senha (pode ser null se usar auth externa)
- `risk_profile`: Perfil de risco do investidor

#### `consultant_profiles`
Perfil adicional para consultores financeiros.

**Campos importantes:**
- `certification`: Certificações (CFP, etc.)
- `watermark_text`: Texto para marca d'água em relatórios
- `calendly_url`: Link para agendamento

#### `customer_consultants`
Relacionamento N:M entre clientes e consultores.

**Permissões:**
- `can_view_all`: Visualizar todos os dados
- `can_message`: Enviar mensagens
- `can_generate_reports`: Gerar relatórios

### 2. Planos e Assinaturas

#### `plans`
Planos de assinatura disponíveis.

**Campos importantes:**
- `connection_limit`: Limite de conexões (NULL = ilimitado)
- `features_json`: Features do plano em JSON

#### `subscriptions`
Assinaturas ativas dos usuários.

**Status:**
- `trialing`: Período de teste
- `active`: Ativa
- `past_due`: Atrasada
- `canceled`: Cancelada
- `paused`: Pausada

#### `payments`
Histórico de pagamentos.

**Status:**
- `pending`: Pendente
- `paid`: Pago
- `failed`: Falhou
- `refunded`: Reembolsado

### 3. Conexões (Open Finance / B3)

#### `institutions`
Instituições financeiras disponíveis.

**Providers:**
- `open_finance`: Open Finance (Puggy, etc.)
- `b3`: B3 (Bolsa de Valores)

#### `connections`
Conexões estabelecidas pelos usuários.

**Status:**
- `connected`: Conectada
- `pending`: Pendente
- `needs_reauth`: Precisa reautenticação
- `failed`: Falhou
- `revoked`: Revogada

**Campos importantes:**
- `external_consent_id`: ID do consentimento no provedor
- `scopes_json`: Escopos autorizados
- `last_sync_at`: Última sincronização
- `last_sync_status`: Status da última sync

### 4. Contas Bancárias e Transações

#### `bank_accounts`
Contas bancárias vinculadas via Open Finance.

**Tipos:**
- `checking`: Conta corrente
- `savings`: Poupança
- etc.

#### `transactions`
Transações bancárias.

**Campos importantes:**
- `amount_cents`: Valor em centavos (negativo = despesa, positivo = receita)
- `category`: Categoria da transação
- `raw_payload`: Dados completos do provedor

### 5. Cartões de Crédito

#### `credit_cards`
Cartões de crédito vinculados.

#### `card_invoices`
Faturas dos cartões.

**Status:**
- `open`: Aberta
- `closed`: Fechada
- `paid`: Paga

#### `invoice_items`
Itens das faturas (transações do cartão).

### 6. Investimentos

#### `assets`
Ativos padronizados (ações, fundos, etc.).

**Classes:**
- `cash`: Dinheiro
- `fixed_income`: Renda fixa
- `equities`: Ações
- `funds`: Fundos
- `etf`: ETFs
- `reit`: REITs
- `derivatives`: Derivativos
- `crypto`: Criptomoedas
- `other`: Outros

#### `holdings`
Posições consolidadas dos usuários.

**Fontes:**
- `open_finance`: Via Open Finance
- `b3`: Via B3
- `manual`: Manual

#### `b3_positions`
Posições específicas da B3.

#### `dividends`
Dividendos recebidos.

#### `corporate_events`
Eventos corporativos (splits, subscrições, etc.).

### 7. Metas e Alertas

#### `goals`
Metas financeiras dos usuários.

**Campos:**
- `target_amount_cents`: Valor alvo
- `current_amount_cents`: Valor atual
- `target_date`: Data alvo

#### `alerts`
Alertas e notificações.

**Severidade:**
- `info`: Informativo
- `warning`: Aviso
- `critical`: Crítico

### 8. CRM e Consultoria

#### `crm_leads`
Leads do CRM dos consultores.

**Stages:**
- `lead`: Lead inicial
- `contacted`: Contatado
- `meeting`: Reunião agendada
- `proposal`: Proposta enviada
- `won`: Ganho
- `lost`: Perdido

#### `tasks`
Tarefas dos consultores.

#### `client_notes`
Notas sobre clientes.

### 9. Mensagens

#### `conversations`
Conversas entre clientes e consultores.

#### `messages`
Mensagens individuais.

### 10. Relatórios

#### `reports`
Histórico de relatórios gerados.

**Tipos:**
- `consolidated`: Consolidado
- `transactions`: Transações
- `monthly_evolution`: Evolução mensal
- `advisor_custom`: Personalizado pelo consultor

### 11. Admin

#### `integration_health`
Monitoramento de saúde das integrações.

**Providers monitorados:**
- Puggy (Open Finance)
- B3
- MercadoPago
- Stripe
- Resend (email)

#### `audit_logs`
Logs de auditoria de ações administrativas.

## Índices

O schema inclui índices otimizados para:

- Consultas por usuário
- Consultas por data (transações, dividendos, etc.)
- Consultas por status (assinaturas, pagamentos, conexões)
- Consultas por categoria (transações)
- Relacionamentos N:M (customer_consultants)

## Triggers

### `set_updated_at()`
Função que atualiza automaticamente o campo `updated_at` em todas as tabelas relevantes quando há uma atualização.

## Extensões PostgreSQL

- `uuid-ossp`: Geração de UUIDs
- `pgcrypto`: Funções criptográficas

## Boas Práticas

1. **UUIDs**: Todas as tabelas usam UUID como chave primária
2. **Timestamps**: Todas as tabelas têm `created_at` e `updated_at`
3. **Soft Deletes**: Use `is_active` em vez de DELETE físico quando possível
4. **JSONB**: Dados flexíveis são armazenados em `*_json` ou `*_payload`
5. **Centavos**: Valores monetários sempre em centavos (BIGINT)
6. **Timezone**: Use TIMESTAMPTZ para todos os timestamps

## Migrações Futuras

Para atualizações futuras do schema, recomenda-se usar um sistema de migrações (ex: Prisma Migrate, TypeORM Migrations, ou Flyway).
