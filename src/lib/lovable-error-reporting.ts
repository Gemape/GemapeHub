type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  track?: (event: string, properties?: Record<string, unknown>) => string | null;
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  // Tentar reporting do Lovable se disponível
  if (typeof window !== "undefined" && window.__lovableEvents?.captureException) {
    window.__lovableEvents.captureException(
      error, 
      { source: "react_error_boundary", route: window.location?.pathname, ...context }, 
      { mechanism: "react_error_boundary", handled: false, severity: "error" }
    );
  }
  
  // Fallback: sempre logar no console
  const message = error instanceof Response 
    ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` 
    : error instanceof Error 
      ? error.message 
      : String(error);
      
  const stack = error instanceof Error ? error.stack : undefined;
  
  if (typeof window !== "undefined" && window.__lovableReportRuntimeError) {
    window.__lovableReportRuntimeError({ 
      message, 
      ...(stack && { stack }), 
      filename: window.location?.pathname 
    });
  } else {
    console.error("[GEMAPE Error]", message, { stack, context });
  }
}
