import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';

const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      // Route: generate blog (text + images)
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return await generateBlogPost(request, env);
      }

      // Route: generate images only
      if (url.pathname === '/api/generate-image' && request.method === 'POST') {
        return await generateImagesEndpoint(request, env);
      }

      // Route: keywords list (reads API.json from static assets)
      if (url.pathname === '/api/keywords' && request.method === 'GET') {
        try {
          const req = new Request(new URL('/API.json', request.url).toString(), request);
          const asset = await getAssetFromKV({ request: req, waitUntil: ctx.waitUntil.bind(ctx) }, { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest });
          const text = await asset.text();
          const parsed = JSON.parse(text);
          // try common keys first
          const candidateKeys = ['supportedNiches', 'supportedKeywords', 'supported'];
          let keywords = [];
          for (const k of candidateKeys) {
            if (Array.isArray(parsed[k])) {
              keywords = parsed[k];
              break;
            }
          }
          // fallback: collect top-level string arrays
          if (keywords.length === 0) {
            for (const k of Object.keys(parsed)) {
              if (Array.isArray(parsed[k]) && parsed[k].every(i => typeof i === 'string')) {
                keywords = keywords.concat(parsed[k]);
              }
            }
            keywords = Array.from(new Set(keywords)).slice(0, 500);
          }
          return jsonResponse({ keywords });
        } catch (err) {
          console.error('Failed to load API.json for keywords:', err);
          return jsonResponse({ keywords: [] });
        }
      }

      // Health
      if (url.pathname === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // Serve static assets
      try {
        return await getAssetFromKV({ request, waitUntil: ctx.waitUntil.bind(ctx) }, { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest });
      } catch (e) {
        try {
          const indexRequest = new Request(new URL('/index.html', request.url).toString(), request);
          return await getAssetFromKV({ request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) }, { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest });
        } catch (e2) {
          return new Response('Not Found', { status: 404 });
        }
      }
    } catch (err) {
      console.error('Worker fetch error:', err);
      return jsonResponse({ error: err.message || 'Unexpected error' }, 500);
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
    // Support either keyword or keywords array
    const { niche, keyword, keywords, topic, length = 'medium', tone = 'professional', imageCount = 0 } = body;
    const finalKeywords = Array.isArray(keywords) && keywords.length > 0 ? keywords : (keyword ? [keyword] : []);
    const blogTopic = topic || `${niche || ''}: ${finalKeywords.join(', ')}`;

    if (!blogTopic.trim()) return jsonResponse({ error: 'Missing topic' }, 400);

    const lengthMap = { short: 300, medium: 600, long: 1000 };
    const maxTokens = lengthMap[length] || 600;

    const messages = [
      { role: 'system', content: 'You are an expert blog writer. Write well-structured blog posts in markdown.' },
      { role: 'user', content: `Write a ${length} blog post about "${blogTopic}" in a ${tone} tone. Use # for title, ## for sections. Include placeholders for images as <!--IMG_n--> where n is image index.` }
    ];

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages,
      max_tokens: maxTokens,
    });

    const content = response?.response || '';
    if (!content.trim()) return jsonResponse({ error: 'AI returned empty response' }, 500);

    // Generate images if requested (imageCount)
    const images = [];
    const count = Math.max(0, Math.min(6, Number(imageCount) || 0)); // cap images for safety
    for (let i = 0; i < count; i++) {
      try {
        const prompt = `Illustration for ${blogTopic} - image ${i + 1}`;
        const imgResult = await generateImageAndUpload(env, prompt);
        images.push({ index: i, url: imgResult.url, preview: imgResult.preview });
      } catch (imgErr) {
        console.error('Image generation/upload failed for index', i, imgErr);
        images.push({ index: i, url: null, preview: null, error: String(imgErr) });
      }
    }

    // Return markdown content and images array. Client will replace <!--IMG_n--> with <img> tags for preview and embed on download.
    return jsonResponse({ success: true, content: content.trim(), topic: blogTopic, images, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('generateBlogPost error:', error);
    return jsonResponse({ error: error.message || 'Failed to generate' }, 500);
  }
}

async function generateImagesEndpoint(request, env) {
  try {
    if (!env.AI) return jsonResponse({ error: 'Workers AI not available' }, 500);
    const body = await request.json();
    const { prompts = [], count = 1 } = body;
    const images = [];
    const total = Math.max(0, Math.min(6, Number(count) || prompts.length || 1));
    for (let i = 0; i < total; i++) {
      const prompt = prompts[i] || prompts[0] || 'blog hero image';
      try {
        const imgResult = await generateImageAndUpload(env, prompt);
        images.push({ index: i, url: imgResult.url, preview: imgResult.preview });
      } catch (err) {
        console.error('generateImagesEndpoint error for', i, err);
        images.push({ index: i, url: null, preview: null, error: String(err) });
      }
    }
    return jsonResponse({ images });
  } catch (err) {
    console.error('generateImagesEndpoint error:', err);
    return jsonResponse({ error: err.message || 'Failed to generate images' }, 500);
  }
}

/**
 * Generate an image using Workers AI and optionally upload to Cloudflare Images (if account token provided)
 * Returns { url, preview }
 */
async function generateImageAndUpload(env, prompt) {
  // Use an image model; adjust model name if needed/available in your env
  const imageModel = '@cf/stabilityai/stable-diffusion-xl-base-1.0';

  // env.AI.run returns a ReadableStream (binary image) for image models
  const aiResponse = await env.AI.run(imageModel, { prompt });

  // Ensure we have a Response/Body we can read as ArrayBuffer
  let arrayBuffer;
  if (aiResponse instanceof Response) {
    arrayBuffer = await aiResponse.arrayBuffer();
  } else if (aiResponse && typeof aiResponse.arrayBuffer === 'function') {
    arrayBuffer = await aiResponse.arrayBuffer();
  } else {
    // Some models return an object with .response being a ReadableStream
    if (aiResponse && aiResponse.response && typeof aiResponse.response.arrayBuffer === 'function') {
      arrayBuffer = await aiResponse.response.arrayBuffer();
    } else {
      throw new Error('Unexpected image response format from env.AI.run');
    }
  }

  // If Cloudflare Images credentials are bound to the Worker (env.CLOUDFLARE_ACCOUNT_ID & env.CLOUDFLARE_API_TOKEN), upload directly
  const cfAccount = env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || null;
  const cfToken = env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN || null;

  if (cfAccount && cfToken) {
    // Upload via Cloudflare Images API
    const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/images/v1`;
    const form = new FormData();
    const fileName = `bloggen-${Date.now()}.png`;
    const blob = new Blob([arrayBuffer], { type: 'image/png' });
    form.append('file', blob, fileName);
    // optional: metadata
    form.append('metadata', JSON.stringify({ prompt }));

    const uploadResp = await fetch(uploadUrl, {
      method: 'POST',
      body: form,
      headers: { Authorization: `Bearer ${cfToken}` }
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      throw new Error('Cloudflare upload failed: ' + errText);
    }

    const uploadJson = await uploadResp.json();
    if (uploadJson && uploadJson.success && uploadJson.result) {
      // choose first variant if available
      const variants = uploadJson.result.variants || [];
      if (variants.length > 0) return { url: variants[0], preview: variants[0] };
      if (uploadJson.result.id) return { url: `https://imagedelivery.net/${cfAccount}/${uploadJson.result.id}/public`, preview: null };
    }
    throw new Error('Cloudflare upload returned unexpected result');
  }

  // If Cloudflare credentials not available, return a data URL (base64) so client can preview/download
  const base64 = arrayBufferToBase64(arrayBuffer);
  const dataUrl = `data:image/png;base64,${base64}`;
  return { url: dataUrl, preview: dataUrl };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
