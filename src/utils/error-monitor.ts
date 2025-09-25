// Lightweight global error monitor for RN/Expo
// Logs meaningful details to console to trace "require(undefined)" and similar issues

type GlobalErrorHandler = (error: any, isFatal?: boolean) => void;

export function installGlobalErrorMonitor(): void {
  try {
    const handler: GlobalErrorHandler = (error, isFatal) => {
      // Avoid crashing symbolicator with non-JSON bodies
      const message = String(error?.message || error);
      const stack = String(error?.stack || 'no-stack');
      // eslint-disable-next-line no-console
      console.error('[GLOBAL_ERROR]', { isFatal: !!isFatal, message, stack });
    };

    // @ts-ignore - ErrorUtils is injected by RN runtime
    if (global.ErrorUtils && typeof global.ErrorUtils.setGlobalHandler === 'function') {
      // @ts-ignore
      global.ErrorUtils.setGlobalHandler(handler);
    }
  } catch {}
}

export class ErrorBoundaryLogger {
  static log(componentName: string, error: any, info?: { componentStack: string }): void {
    try {
      const message = String(error?.message || error);
      const stack = String(error?.stack || info?.componentStack || 'no-stack');
      // eslint-disable-next-line no-console
      console.error('[REACT_ERROR]', { component: componentName, message, stack });
    } catch {}
  }
}


