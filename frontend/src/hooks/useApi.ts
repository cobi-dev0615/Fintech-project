import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

export function useApiQuery<TData = unknown, TError = ApiError>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...options,
  });
}

export function useApiMutation<TData = unknown, TVariables = void, TError = ApiError>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate relevant queries on success
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
  });
}
