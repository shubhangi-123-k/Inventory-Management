import axios from 'axios';

let rawBaseURL = (import.meta.env.VITE_BACKEND_TARGET || '').trim();
if (rawBaseURL.endsWith('/') && rawBaseURL.length > 1) {
  rawBaseURL = rawBaseURL.slice(0, -1);
}
if (rawBaseURL && !rawBaseURL.endsWith('/api')) {
  rawBaseURL = `${rawBaseURL}/api`;
}

const api = axios.create({
  baseURL: rawBaseURL,
  headers: {
    'X-Tunnel-Skip-Anti-Phishing-Page': '1',
  },
});

const getLoginUrl = () => {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? `${base}login` : `${base}/login`;
};

const getMyApprovalsUrl = () => {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? `${base}my-approvals` : `${base}/my-approvals`;
};

api.interceptors.request.use((config) => {
  if (config.headers) {
    config.headers['X-Tunnel-Skip-Anti-Phishing-Page'] = '1';
  }
  const token = localStorage.getItem('token');
  // If a mock token was previously stored, purge it immediately
  if (token && token.startsWith('mock-')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!window.location.pathname.endsWith('/login')) {
      window.location.href = getLoginUrl();
    }
    return config;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Audit Compliance: Validate mandatory reason on DELETE requests
  if (config.method?.toLowerCase() === 'delete') {
    let reason = null;
    if (config.data) {
      if (typeof config.data === 'string') {
        try {
          const parsed = JSON.parse(config.data);
          reason = parsed?.reason;
        } catch {
          reason = config.data;
        }
      } else if (typeof config.data === 'object') {
        reason = config.data.reason;
      }
    }
    if (!reason || String(reason).trim().length < 5) {
      console.warn(`[Audit Compliance Warning] DELETE ${config.url} dispatched without mandatory 5+ character reason:`, config.data);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    // Maker-Checker HTTP 202 Interception Rule
    if (response.status === 202 || response.data?.pending_approval === true) {
      const message = response.data?.message || 'Change request submitted for Super Admin approval.';
      const requestId = response.data?.change_request_id;

      // Mark response object so callers know change is staged, preventing optimistic table modifications
      if (response.data && typeof response.data === 'object') {
        response.data.pending_approval = true;
      }

      // Trigger global notification toast with action link to /my-approvals
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: {
            type: 'warning',
            title: 'Submitted for Super Admin Approval',
            message: message,
            duration: 6000,
            action: {
              label: 'View Submissions',
              url: getMyApprovalsUrl(),
              requestId: requestId,
            },
          },
        })
      );

      // Dispatch global event for modals/drawers to close and reset dirty states
      window.dispatchEvent(
        new CustomEvent('approval:pending', {
          detail: response.data,
        })
      );

      // Trigger badge and stats refresh event across the application
      window.dispatchEvent(new CustomEvent('approval:stats_updated'));
    }

    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`[API Error ${error.response.status}] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, JSON.stringify(error.response.data));
    }
    const isTokenError = 
      error.response && 
      (error.response.status === 401 || 
       (error.response.status === 403 && (
         typeof error.response.data?.error === 'string' && 
         error.response.data.error.toLowerCase().includes('token')
       )));

    if (isTokenError && !window.location.pathname.endsWith('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = getLoginUrl();
    }
    return Promise.reject(error);
  }
);

export default api;
