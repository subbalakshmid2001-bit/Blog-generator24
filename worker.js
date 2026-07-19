/**
 * Cloudflare Worker for Blog Generator
 * Serves React app from client/build and provides /api/generate endpoint with Workers AI
 * Uses @cloudflare/kv-asset-handler for static asset serving
 */

import { Router } from 'itty-router';
import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

const router = Router();

/**
 * Generate blog post using Cloudflare Workers AI (Llama 2)
 * No secrets required - uses env.AI binding
 */
async function generateBlogPost(request, env) {
  try {
    if (!env.AI) {
      return jsonResponse(
        { error: 'Workers AI not available in this environment' },
        500
      );
    }

    const body = await request.json();
    const { topic, tone = 'professional', length = 'medium' } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return jsonResponse(
        { error: 'Missing or invalid required parameter: topic' },
        400
      );
    }

    if (!['professional', 'casual', 'technical', 'creative'].includes(tone)) {
      return jsonResponse(
        { error: 'Invalid tone. Use: professional, casual, technical, or creative' },
        400
      );
    }

    if (!['short', 'medium', 'long'].includes(length)) {
      return jsonResponse(
        { error: 'Invalid length. Use: short, medium, or long' },
        400
      );
    }

    // Map length to token count
    const lengthMap = {
      short: 300,
      medium: 600,
      long: 1000,
    };

    const maxTokens = lengthMap[length];
    const cleanTopic = topic.trim().substring(0, 200);

    // Create the prompt
    const prompt = `You are an expert blog writer. Write a ${length} blog post about "${cleanTopic}" in a ${tone} tone.

Structure the post with:
- An engaging title (as # Heading)
- An introduction paragraph
- 2-3 main sections with ## subheadings
- A conclusion
- Use markdown formatting for readability

Keep the content informative and engaging.`;

    // Call Workers AI with Llama 2 model
    const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      prompt,
      max_tokens: maxTokens,
    });

    if (!response || !response.result) {
      return jsonResponse(
        { error: 'AI generation failed - no response from model' },
        500
      );
    }

    const generatedText = response.result.response || '';

    if (!generatedText || generatedText.trim().length === 0) {
      return jsonResponse(
        { error: 'AI model returned empty response' },
        500
      );
    }

    return jsonResponse({
      success: true,
      topic: cleanTopic,
      tone,
      length,
      content: generatedText.trim(),
      model: '@cf/meta/llama-2-7b-chat-int8',
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

/**
 * Health check endpoint
 */
function healthCheck() {
  return jsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'blog-generator',
  });
}

/**
 * Helper to create JSON responses with CORS headers
 */
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

/**
 * Handle preflight CORS requests
 */
router.options('*', () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
});

/**
 * API endpoints
 */
router.post('/api/generate', generateBlogPost);
router.get('/api/health', healthCheck);

/**
 * Main fetch handler with static asset serving
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      // Handle API routes with router
      if (url.pathname.startsWith('/api/')) {
        return await router.handle(request, env, ctx);
      }

      // Handle static assets with KV
      try {
        // Map request to asset, handling SPA routing
        let mappedRequest = mapRequestToAsset(request);
        
        const asset = await getAssetFromKV(
          {
            request: mappedRequest,
            waitUntil: ctx.waitUntil,
          },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST
              ? JSON.parse(env.__STATIC_CONTENT_MANIFEST)
              : {},
          }
        );

        // Set proper cache headers based on asset type
        const response = new Response(asset, { status: 200 });
        
        // Cache versioned assets (with hash in filename) for 1 year
        if (url.pathname.match(/\.[a-f0-9]+\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i)) {
          response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Don't cache HTML files - always revalidate
        else if (url.pathname.endsWith('.html') || url.pathname === '/') {
          response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
        }
        // Cache static assets for 1 hour
        else {
          response.headers.set('Cache-Control', 'public, max-age=3600');
        }

        return response;
      } catch (e) {
        // If not found and it looks like a file, return 404
        if (url.pathname.includes('.') || url.pathname.includes('/static/')) {
          console.warn(`Asset not found: ${url.pathname}`);
          return new Response('Not Found', { status: 404 });
        }

        // For SPA routes without a file extension, try to serve index.html
        try {
          const indexRequest = new Request(
            new URL('/index.html', request.url),
            {
              method: request.method,
              headers: request.headers,
            }
          );

          const indexAsset = await getAssetFromKV(
            {
              request: indexRequest,
              waitUntil: ctx.waitUntil,
            },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST
                ? JSON.parse(env.__STATIC_CONTENT_MANIFEST)
                : {},
            }
          );

          const response = new Response(indexAsset, { status: 200 });
          response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
          return response;
        } catch (indexError) {
          console.error(`Failed to serve index.html: ${indexError.message}`);
          return new Response(
            JSON.stringify({ error: 'Failed to load application' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    } catch (error) {
      console.error('Unhandled error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
