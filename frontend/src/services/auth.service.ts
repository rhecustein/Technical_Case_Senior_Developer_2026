import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const authService = {
  async login(username: string, password: string): Promise<{ access_token: string; user: { id: string; username: string } }> {
    const response = await axios.post(`${BASE_URL}/auth/login`, { username, password });
    return response.data.data ?? response.data;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  },
};
