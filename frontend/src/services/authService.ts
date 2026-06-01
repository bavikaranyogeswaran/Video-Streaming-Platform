import api from './api.ts';

export interface AuthResponse {
  access_token: string;
  username: string;
}

export const authService = {
  login: async (username: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { username, password });
    return res.data;
  },

  register: async (username: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/register', { username, password });
    return res.data;
  },
};
