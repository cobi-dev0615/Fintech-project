/**
 * API barrel: re-exports the shared client and all domain API modules.
 * Import from '@/lib/api' for backward compatibility, or from '@/lib/api-*' for domain-specific imports.
 */

export { api, ApiError } from './api-client';
export { authApi } from './api-auth';
export { userApi } from './api-users';
export { commentsApi } from './api-comments';
export { dashboardApi } from './api-dashboard';
export { connectionsApi } from './api-connections';
export { financeApi } from './api-finance';
export { accountsApi } from './api-accounts';
export { cardsApi } from './api-cards';
export { investmentsApi } from './api-investments';
export { reportsApi } from './api-reports';
export { goalsApi } from './api-goals';
export { notificationsApi } from './api-notifications';
export { subscriptionsApi } from './api-subscriptions';
export { customerApi } from './api-customer';
export { publicApi } from './api-public';
export { adminApi } from './api-admin';
export { consultantApi } from './api-consultant';
