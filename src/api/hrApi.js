import axios from 'axios';
import { NativeModules, Platform } from 'react-native';

const DEFAULT_PORT = '5000';
// Same backend used by the website project (WeisetechData/salary-portal).
// Keep this non-empty to use hosted backend without local networking setup.
const API_BASE_OVERRIDE = 'https://weisetechdata.onrender.com/api';
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

function getBaseURL() {
  const overrideBaseURL = normalizeBaseURL(API_BASE_OVERRIDE);
  if (overrideBaseURL) {
    return overrideBaseURL;
  }

  if (MANUAL_DEV_HOST && MANUAL_DEV_HOST.trim()) {
    return `http://${MANUAL_DEV_HOST}:${DEFAULT_PORT}/api`;
  }

  const metroHost = getMetroHost();
  if (metroHost) {
    return `http://${metroHost}:${DEFAULT_PORT}/api`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }

  return `http://localhost:${DEFAULT_PORT}/api`;
}

export const apiBaseURL = getBaseURL();

const hrApi = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
});

export default hrApi;
