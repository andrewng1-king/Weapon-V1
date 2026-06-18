export const queryKeys = {
  users: ['users'] as const,
  state: (userId: string) => ['state', userId] as const,
};
