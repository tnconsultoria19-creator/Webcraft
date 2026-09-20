import { handleApiRequest } from './db/apiHandlers';
import { GoogleGenAI } from '@google/genai';
import { ensureD1Schema } from './db/d1Init';

interface Env {
  DB: any;
  BUCKET: any;
  GEMINI_API_KEY?: string;
  ASSETS?: any;
}

// Initialize the D1 schema at most once per Worker isolate.
// Running PRAGMA/CREATE checks on every request was adding unnecessary database work.
let schemaReady: Promise<void> | null = null;

function ensureSchemaOnce(db: any): Promise<void> {
  if (!schemaReady) {
    schemaReady = ensureD1Schema(db).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    await ensureSchemaOnce(env.DB);
    const url = new URL(request.url);
    const { pathname, search } = url;

    // CORS Headers for APIs
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. ROUTE API CALLS TO DECOUPLED HANDLERS
    if (pathname.startsWith('/api/')) {
      // Handle the Gemini AI Assistant route
      if (pathname === '/api/ai/sales-assistant' && request.method === 'POST') {
        try {
          const body = await request.json() as any;
          const { message, leadContext } = body;
          
          const apiKey = env.GEMINI_API_KEY || '';
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: 'GEMINI_API_KEY secret is not configured in this Cloudflare Worker environment.' }),
              { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          const ai = new GoogleGenAI({ apiKey });
          const prompt = `You are a highly persuasive, professional sales copywriter and outreach assistant for WebCraft Studio. 
WebCraft Studio builds custom high-converting website templates for small and local businesses.

Context about the target lead client:
${JSON.stringify(leadContext || {}, null, 2)}

User request/message:
"${message}"

Write a concise, professional, and ultra-persuasive response or outreach draft. Include specific hooks matching their industry and existing online status. Keep it professional, objective, and clear.`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });

          return new Response(
            JSON.stringify({ text: response.text }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err.message || 'AI Assistant Error' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      }

      // Read JSON body for standard API POST methods
      let body: any = null;
      if (request.method === 'POST' || request.method === 'PUT') {
        try {
          body = await request.json();
        } catch (e) {
          body = {};
        }
      }

      // Convert standard headers to a simple map
      const headersMap: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headersMap[key] = value;
      });

      try {
        const result = await handleApiRequest(pathname, request.method, body, headersMap, env);
        return new Response(JSON.stringify(result.json), {
          status: result.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || 'Internal Server Error' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Serve lead image files directly from Cloudflare R2.
    if (pathname.startsWith('/api/uploads/file/') && request.method === 'GET') {
      const objectKey = decodeURIComponent(pathname.slice('/api/uploads/file/'.length));
      if (!env.BUCKET) return new Response('R2 storage is not configured.', { status: 500 });
      const object = await env.BUCKET.get(objectKey);
      if (!object) return new Response('File not found.', { status: 404 });
      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(object.body, { headers });
    }

    // 2. SERVE STATIC FRONTEND ASSETS AND FALLBACK (SPA ROUTING)
    if (env.ASSETS) {
      try {
        // Fetch static asset from binding
        let response = await env.ASSETS.fetch(request);
        
        // If file not found (404) and not an API call, serve index.html for SPA Routing
        if (response.status === 404 && !pathname.startsWith('/api/')) {
          const indexRequest = new Request(new URL('/index.html', request.url).toString());
          response = await env.ASSETS.fetch(indexRequest);
        }
        return response;
      } catch (e) {
        return new Response('Asset not found or failed to load.', { status: 404 });
      }
    }

    return new Response('WebCraft Studio Cloudflare Worker. Backend Active.', { status: 200 });
  }
};
