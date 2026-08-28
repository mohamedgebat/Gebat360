import { httpClient } from './client';

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    return httpClient<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  refresh: async () => {
    return httpClient<any>('/auth/refresh', {
      method: 'POST',
    });
  },
  logout: async () => {
    return httpClient<any>('/auth/logout', {
      method: 'POST',
    });
  },
};
