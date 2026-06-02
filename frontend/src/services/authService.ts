import api from './api.ts';

export interface LoginResponse {
  access_token: string;
  username: string;
}

export const authService = {
  login: async (identifier: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', {
      identifier,
      password,
    });
    return res.data;
  },

  /**
   * The backend's POST /auth/register returns only { message }, so we
   * immediately chain a login call and surface the token to the UI.
   * Treating registration as a single atomic auth step is what users expect.
   */
  register: async (
    username: string,
    email: string,
    password: string,
  ): Promise<{ message: string }> => {
    const res = await api.post('/auth/register', { username, email, password });
    return res.data;
  },
};
