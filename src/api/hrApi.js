import axios from 'axios';
import { NativeModules, Platform } from 'react-native';

const DEFAULT_PORT = '5000';
// The primary backend — same server as the web portal (salary-portal).
// Change to the hosted Render URL if the VM is not reachable.
const VM_BASE    = 'http://34.31.128.176:5000/api';
const RENDER_BASE = 'https://weisetechdata.onrender.com/api';

// Optional LAN host for local backend testing. Example: '192.168.1.20'
const MANUAL_DEV_HOST = '';

function normalizeBaseURL(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getMetroHost() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
  const match = scriptURL.match(/^https?:\/\/([^/:]+)/i);
  return match?.[1] || null;
}

function getLocalBaseURL() {
  if (MANUAL_DEV_HOST && MANUAL_DEV_HOST.trim()) {
    return normalizeBaseURL(`http://${MANUAL_DEV_HOST}:${DEFAULT_PORT}/api`);
  }
  const metroHost = getMetroHost();
  if (metroHost && metroHost !== 'localhost') {
    return `http://${metroHost}:${DEFAULT_PORT}/api`;
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }
  return `http://localhost:${DEFAULT_PORT}/api`;
}

// Primary: same VM as the web portal (has all routes including holidays).
// Fallback 1: Render hosted backend (on network error from VM).
// Fallback 2: local dev backend (on network error from Render).
export const apiBaseURL = VM_BASE;

const hrApi = axios.create({
  baseURL: VM_BASE,
  timeout: 15000,
});

hrApi.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;
    const isNetworkError = !err.response;
    if (!isNetworkError) return Promise.reject(err);

    // VM unreachable → try Render
    if (!config._retriedRender) {
      config._retriedRender = true;
      return axios({ ...config, baseURL: RENDER_BASE });
    }

    // Render also unreachable → try local dev backend
    if (!config._retriedLocal) {
      config._retriedLocal = true;
      return axios({ ...config, baseURL: getLocalBaseURL() });
    }

    return Promise.reject(err);
  },
);

export default hrApi;
