// Backend URL - Railway'deki adres
const API_URL = 'https://tektik-laa-production.up.railway.app';

// Token yönetimi
const Auth = {
  setToken(token) {
    localStorage.setItem('tektik_token', token);
  },
  getToken() {
    return localStorage.getItem('tektik_token');
  },
  setUser(user) {
    localStorage.setItem('tektik_user', JSON.stringify(user));
  },
  getUser() {
    const user = localStorage.getItem('tektik_user');
    return user ? JSON.parse(user) : null;
  },
  logout() {
    localStorage.removeItem('tektik_token');
    localStorage.removeItem('tektik_user');
    window.location.href = '/login';
  },
  isLoggedIn() {
    return !!this.getToken();
  }
};

// API çağrıları için yardımcı fonksiyon
async function apiCall(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Bir hata oluştu');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}
