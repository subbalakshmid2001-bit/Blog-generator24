import { Router } from 'itty-router';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';

const assetManifest = JSON.parse(manifestJSON);
const router = Router();

async function generateBlogPost(request, env) {
  try {
    if (!env.AI) {
      return jsonResponse({ error: 'Workers AI not available' }, 500);
    }

    const body = await request.json();
    const { topic, niche, keyword, tone = 'professional', length = 'medium' } = body;

    // Accept topic OR niche+keyword from React frontend
    const blogTopic = topic || `${niche}: ${keyword}` || '';

    if (!blogTopic || blogTopic.trim().length === 0) {
      return jsonResponse({ error: 'Missing topic or niche/keyword' }, 400);
    }

    const lengthMap = { short: 300, medium: 600, long: 1000 };
    const maxTokens = lengthMap[length] || 600;
    const cleanTopic = blogTopic.trim().substring(0, 200);

    const messages = [
      {
        role: 'system',
        content: 'You are an expert blog writer. Write well-structured, engaging blog posts in markdown format.'
      },
      {
        role: 'user',
        content: `Write a ${length} blog post about "${cleanTopic}" in a ${tone} tone. Structure it with: # Title, introduction, 2-3 ## sections, and a conclusion. Use markdown formatting.`
      }
    ];

    // ✅ Updated to llama-3.1-8b-instruct-fast (llama-2 is deprecated)
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages,
      max_tokens: maxTokens,
    });

    const generatedText = response?.response || '';

    if (!generatedText || generatedText.trim().length === 0) {
      return jsonResponse({ error: 'AI model returned empty response' }, 500);
    }

    return jsonResponse({
      success: true,
      topic: cleanTopic,
      tone,
      length,
      content: generatedText.trim(),
      model: '@cf/meta/llama-3.1-8b-instruct-fast',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Blog generation error:', error);
    const errorMessage = error instanceof SyntaxError
      ? 'Invalid JSON in request body'
      : error.message || 'Failed to generate blog post';
    return jsonResponse({ error: errorMessage }, 500);
  }
}

function healthCheck() {
  return jsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'blog-generator',
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

router.options('*', () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
}));

router.post('/api/generate', generateBlogPost);
router.get('/api/health', healthCheck);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return await router.handle(request, env, ctx);
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
  },
};
