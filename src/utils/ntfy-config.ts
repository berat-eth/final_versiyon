export const NTFY_CONFIG = {
  serverUrl: 'https://ntfy.example.com',
  topicPrefix: 'huglu-mobile-',
};

export function getNtfyWebSocketUrl(): string {
  try {
    const url = new URL(NTFY_CONFIG.serverUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    return url.toString();
  } catch {
    return 'wss://ntfy.example.com/ws';
  }
}


