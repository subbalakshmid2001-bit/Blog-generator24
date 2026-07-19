import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';

const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/generate' && request.method === 'POST') {
      return generateBlogPost(request, env);
    }

    if (url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
      );
    } catch (e) {
      try {
        const indexRequest = new Request(
          new URL('/index.html', request.url).toString(), request
        );
        return await getAssetFromKV(
          { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
          { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
        );
      } catch (e2) {
        return new Response('Not Found', { status: 404 });
      }
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

async function generateBlogPost(request, env) {
  try {
    if (!env.AI) return jsonResponse({ error: 'Workers AI not available' }, 500);

    const body = await request.json();
    const { niche, keyword, topic, length = 'medium', tone = 'professional' } = body;
    const blogTopic = topic || `${niche}: ${keyword}`;

    if (!blogTopic.trim()) return jsonResponse({ error: 'Missing topic' }, 400);

    const lengthMap = { short: 300, medium: 600, long: 1000 };
    const maxTokens = lengthMap[length] || 600;

    const messages = [
      { role: 'system', content: 'You are an expert blog writer. Write well-structured blog posts in markdown.' },
      { role: 'user', content: `Write a ${length} blog post about "${blogTopic}" in a ${tone} tone. Use # for title, ## for sections.` }
    ];

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages,
      max_tokens: maxTokens,
    });

    const content = response?.response || '';
    if (!content.trim()) return jsonResponse({ error: 'AI returned empty response' }, 500);

    return jsonResponse({
      success: true,
      content: content.trim(),
      topic: blogTopic,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return jsonResponse({ error: error.message || 'Failed to generate' }, 500);
  }
}
