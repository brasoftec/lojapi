/**
 * Cloudflare Worker — lojapi
 * Domínio: api.ofertatop.com.br
 *
 * Lógica:
 * 1. Tenta rotear para o Worker (execução local)
 * 2. Se atingir limite do plano gratuito (429 / 1015) ou erro 5xx → fallback Azure
 * 3. Injeta headers de rastreamento e CORS
 */

export interface Env {
  AZURE_BACKEND_URL: string;   // https://lojapi.azurecontainerapps.io
  ENVIRONMENT: string;          // production
}

// Códigos que disparam o fallback para Azure
const FALLBACK_CODES = new Set([429, 503, 502, 504, 1015]);

// Headers CORS padrão
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Store-ID',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check do próprio Worker
    if (url.pathname === '/worker-status') {
      return Response.json({
        status: 'ok',
        worker: true,
        timestamp: new Date().toISOString(),
        azure_backend: env.AZURE_BACKEND_URL,
      });
    }

    // Clona o request para poder reenviar ao Azure se necessário
    const requestClone = request.clone();

    // ── Tenta o backend Azure diretamente ────────────────────────────────────
    // O Worker atua como proxy inteligente: encaminha para Azure Container App
    // e monitora os códigos de resposta.
    try {
      const azureUrl = `${env.AZURE_BACKEND_URL}${url.pathname}${url.search}`;

      const azureRequest = new Request(azureUrl, {
        method: request.method,
        headers: addProxyHeaders(request.headers, 'azure-primary'),
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : requestClone.body,
      });

      const response = await fetch(azureRequest);

      // Se Azure retornou erro de limite/indisponível, tenta região secundária
      if (FALLBACK_CODES.has(response.status)) {
        return buildErrorResponse(response.status, 'Serviço temporariamente indisponível', url.pathname);
      }

      // Injeta headers de rastreamento na resposta
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
      newHeaders.set('X-Served-By', 'azure');
      newHeaders.set('X-Worker-Version', '1.0.0');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });

    } catch (err) {
      console.error('Worker error:', err);
      return buildErrorResponse(503, 'Serviço indisponível', url.pathname);
    }
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function addProxyHeaders(original: Headers, via: string): Headers {
  const headers = new Headers(original);
  headers.set('X-Forwarded-By', 'cloudflare-worker');
  headers.set('X-Via', via);
  headers.set('X-Request-Time', new Date().toISOString());
  // Remove headers que podem causar conflito
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  return headers;
}

function buildErrorResponse(status: number, message: string, path: string): Response {
  return Response.json(
    {
      error: message,
      path,
      timestamp: new Date().toISOString(),
      support: 'suporte@ofertatop.com.br',
    },
    {
      status,
      headers: corsHeaders,
    }
  );
}
