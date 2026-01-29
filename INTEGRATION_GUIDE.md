# Guia de Integração Frontend-Backend

Este guia explica como o frontend e backend estão integrados no projeto zurT.

## Arquitetura

```
Frontend (React + Vite)          Backend (Fastify + PostgreSQL)
┌─────────────────────┐         ┌──────────────────────┐
│                     │         │                      │
│  React Components   │◄───────►│  REST API Routes     │
│                     │  HTTP   │                      │
│  React Query        │         │  JWT Authentication  │
│                     │         │                      │
│  API Client         │         │  Database (PostgreSQL)│
│                     │         │                      │
└─────────────────────┘         └──────────────────────┘
```

## Configuração

### Backend

1. **Instalar dependências:**
```bash
cd backend
npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
# Edite .env com suas configurações
```

3. **Configurar banco de dados:**
```bash
npm run db:schema   # fresh DB only
npm run db:migrate # incremental migrations
```

4. **Iniciar servidor:**
```bash
npm run dev
# Servidor rodando em http://localhost:3000
```

### Frontend

1. **Configurar variáveis de ambiente:**
```bash
cd frontend
cp .env.example .env
# Edite .env com VITE_API_URL=http://localhost:3000/api
```

2. **Instalar dependências (se necessário):**
```bash
npm install
```

3. **Iniciar servidor de desenvolvimento:**
```bash
npm run dev
# Frontend rodando em http://localhost:5173
```

## Estrutura de Integração

### Backend (`backend/src/`)

- **`index.ts`**: Ponto de entrada, configuração do servidor Fastify
- **`db/connection.ts`**: Conexão com PostgreSQL
- **`routes/`**: Rotas da API organizadas por módulo
  - `auth.ts`: Autenticação (login, registro)
  - `users.ts`: Perfil de usuário
  - `dashboard.ts`: Dados do dashboard
  - `connections.ts`: Conexões Open Finance/B3
  - `accounts.ts`: Contas bancárias e transações
  - `cards.ts`: Cartões de crédito
  - `investments.ts`: Investimentos

### Frontend (`frontend/src/`)

- **`lib/api.ts`**: Cliente HTTP base e endpoints da API
- **`lib/auth.ts`**: Serviço de autenticação
- **`hooks/useAuth.ts`**: Hook React para autenticação
- **`hooks/useApi.ts`**: Hooks utilitários para React Query

## Fluxo de Autenticação

1. **Registro/Login:**
   - Usuário preenche formulário
   - Frontend chama `authService.login()` ou `authService.register()`
   - Backend valida e retorna JWT token
   - Token é armazenado no localStorage e adicionado a todas as requisições

2. **Requisições Autenticadas:**
   - Frontend adiciona `Authorization: Bearer <token>` no header
   - Backend valida token usando `fastify.authenticate`
   - Se válido, `request.user` contém `userId` e `role`

## Exemplo de Uso

### No Frontend

```typescript
import { useAuth } from '@/hooks/useAuth';
import { dashboardApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
    enabled: isAuthenticated,
  });
  
  if (isLoading) return <div>Carregando...</div>;
  
  return <div>Patrimônio: R$ {data?.netWorth}</div>;
}
```

### No Backend

```typescript
fastify.get('/api/dashboard/summary', {
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const userId = (request.user as any).userId;
  
  // Buscar dados do banco
  const result = await db.query(
    'SELECT ... FROM ... WHERE user_id = $1',
    [userId]
  );
  
  return reply.send({ data: result.rows });
});
```

## Endpoints Disponíveis

### Autenticação
- `POST /api/auth/register` - Registrar
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual

### Dashboard
- `GET /api/dashboard/summary` - Resumo
- `GET /api/dashboard/net-worth-evolution` - Evolução

### Conexões
- `GET /api/connections` - Listar conexões
- `GET /api/connections/institutions` - Instituições disponíveis

### Contas
- `GET /api/accounts` - Listar contas
- `GET /api/accounts/transactions` - Transações

### Cartões
- `GET /api/cards` - Listar cartões
- `GET /api/cards/:cardId/invoices` - Faturas

### Investimentos
- `GET /api/investments/holdings` - Posições
- `GET /api/investments/summary` - Resumo

## Tratamento de Erros

O frontend trata erros automaticamente:

```typescript
try {
  await authService.login(email, password);
} catch (error: any) {
  // error.error contém a mensagem de erro
  setError(error?.error || 'Erro desconhecido');
}
```

## CORS

O backend está configurado para aceitar requisições do frontend:

```typescript
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

## Próximos Passos

1. Adicionar proteção de rotas no frontend
2. Implementar refresh token
3. Adicionar tratamento de erros global
4. Implementar cache de dados
5. Adicionar loading states
6. Implementar retry automático em caso de falha
