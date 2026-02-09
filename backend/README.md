# zurT Backend

Backend API para a plataforma de consolidação financeira zurT.

## Estrutura do Projeto

```
backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── db/
│   │   └── connection.ts     # Database connection
│   └── routes/
│       ├── auth.ts           # Authentication routes
│       ├── users.ts           # User routes
│       ├── dashboard.ts       # Dashboard routes
│       ├── connections.ts     # Connections routes
│       ├── accounts.ts         # Accounts routes
│       ├── cards.ts            # Credit cards routes
│       └── investments.ts      # Investments routes
├── schema.sql                 # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite `.env` com suas configurações:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/zurt_db
PORT=3000
FRONTEND_URL=http://localhost:8080
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Configurar banco de dados

**Banco novo (vazio):** execute o schema base e depois as migrações:

```bash
npm run db:schema
npm run db:migrate
```

**Banco existente:** execute apenas as migrações:

```bash
npm run db:migrate
```

Todas as migrações incrementais ficam em `src/db/migrations/` e são aplicadas em ordem. Veja [MIGRATIONS.md](./MIGRATIONS.md) para detalhes.

### 4. Executar em desenvolvimento

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

## API Endpoints

### Autenticação

- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Obter usuário atual (requer autenticação)

### Usuários

- `GET /api/users/profile` - Obter perfil do usuário
- `PATCH /api/users/profile` - Atualizar perfil

### Dashboard

- `GET /api/dashboard/summary` - Resumo do dashboard
- `GET /api/dashboard/net-worth-evolution` - Evolução do patrimônio

### Conexões

- `GET /api/connections` - Listar conexões
- `GET /api/connections/institutions` - Listar instituições disponíveis

### Contas

- `GET /api/accounts` - Listar contas bancárias
- `GET /api/accounts/transactions` - Listar transações

### Cartões

- `GET /api/cards` - Listar cartões de crédito
- `GET /api/cards/:cardId/invoices` - Listar faturas de um cartão

### Investimentos

- `GET /api/investments/holdings` - Listar posições
- `GET /api/investments/summary` - Resumo do portfólio

## Tecnologias

- **Fastify** - Framework web rápido
- **PostgreSQL** - Banco de dados
- **TypeScript** - Tipagem estática
- **JWT** - Autenticação
- **bcrypt** - Hash de senhas
- **Zod** - Validação de dados

## Desenvolvimento

### Estrutura de Rotas

Cada rota está em um arquivo separado em `src/routes/`. As rotas são registradas em `src/index.ts`.

### Autenticação

Use o decorator `fastify.authenticate` nas rotas que requerem autenticação:

```typescript
fastify.get('/protected', {
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const userId = (request.user as any).userId;
  // ...
});
```

### Validação

Use Zod para validar dados de entrada:

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const body = schema.parse(request.body);
```

## Próximos Passos

1. Implementar integração com Open Finance (Puggy)
2. Implementar integração com B3
3. Adicionar jobs de sincronização
4. Implementar webhooks
5. Adicionar testes
6. Configurar CI/CD
