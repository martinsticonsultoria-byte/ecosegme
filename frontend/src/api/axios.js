import axios from 'axios';

let activeRequests = 0;

const showBar = () => {
  let bar = document.getElementById('loading-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'loading-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:#1f9c74;z-index:9999;transition:width 0.2s ease;width:0';
    document.body.appendChild(bar);
  }
  bar.style.width = '70%';
  bar.style.opacity = '1';
};

const hideBar = () => {
  const bar = document.getElementById('loading-bar');
  if (bar) {
    bar.style.width = '100%';
    setTimeout(() => { bar.style.opacity = '0'; bar.style.width = '0'; }, 300);
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  activeRequests++;
  showBar();
  return config;
});

api.interceptors.response.use(
  (response) => {
    activeRequests--;
    if (activeRequests === 0) hideBar();
    return response;
  },
  (error) => {
    activeRequests--;
    if (activeRequests === 0) hideBar();
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
