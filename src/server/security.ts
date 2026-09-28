export function allowedOrigin(request: Request, appUrl: string): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(appUrl).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}

export function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
