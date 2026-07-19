# Cloudflare Deployment Guide for Blog-generator24

This document explains how to deploy the repository to Cloudflare (Pages or Workers) and how to securely provide Cloudflare credentials (Account ID and API token) and any AI provider tokens (Replicate) so the app will generate images, upload them to Cloudflare Images, and operate exactly as designed.

Important: Do NOT commit secrets to Git. Use Cloudflare Pages environment variables or wrangler secrets/bindings for Workers.

Required environment variables (one-time setup)
- CLOUDFLARE_ACCOUNT_ID (or CF_ACCOUNT_ID)
- CLOUDFLARE_API_TOKEN (or CF_API_TOKEN)
- REPLICATE_API_TOKEN (if you use Replicate for image generation)

The server checks several fallback names; the safest canonical names are the ones above.

Recommended Cloudflare API token scope (create a scoped token):
- Go to Cloudflare Dashboard → My Profile → API Tokens → Create Token
- Choose Custom token and grant:
  - Account → Images → Edit
  - (optional) Account → Read (if you need account metadata)
- Copy the token value — it will not be shown again.

Options to host the server and deploy

1) Cloudflare Pages (recommended for frontend) + external Node server for image generation (recommended for heavy image processing):
   - Deploy the React frontend to Cloudflare Pages (site: ./client/build). Configure environment variables in the Pages project settings for previews and production.
   - Host the Node/Express server (server/) on a Node-friendly host (e.g., Cloud Run, Railway, Render, Heroku). There, set the environment variables (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, REPLICATE_API_TOKEN).
   - Pages frontend will call your server endpoints (set the correct API_BASE_URL in client if needed). This avoids Workers runtime limits and allows sharp/replicate to run properly.

2) Cloudflare Workers (only for light serverless logic):
   - You can deploy worker.js as an edge function with wrangler but note: Node-only modules (sharp, replicate official Node SDK, fs) do NOT run in Workers runtime.
   - If you want to keep the full Node server (including image optimization with sharp), do NOT port the server to a Worker — instead keep it on Node hosting.
   - If you still want image generation on the edge, you must rewrite server logic to be Worker-compatible (no sharp, no replicate Node client, use HTTP APIs, and offload heavy tasks).

How to add env vars for Pages (UI)
1. Open your Cloudflare Pages project.
2. Settings → Environment variables (or "Variables & secrets").
3. Add variables:
   - Name: CLOUDFLARE_ACCOUNT_ID → Value: <your-account-id>
   - Name: CLOUDFLARE_API_TOKEN   → Value: <your-scoped-api-token>
   - Name: REPLICATE_API_TOKEN    → Value: <your-replicate-token> (optional)
4. Save and redeploy the Pages site (or trigger commit).

How to add secrets for Workers using wrangler (CLI)
- Install wrangler and authenticate: wrangler login
- Run the following commands (they store secrets for your worker environment):

  wrangler secret put CLOUDFLARE_API_TOKEN
  wrangler secret put CLOUDFLARE_ACCOUNT_ID
  wrangler secret put REPLICATE_API_TOKEN

- Alternatively use the Cloudflare dashboard to create secrets for Workers / Functions.

How the code uses these variables
- server/services/imageGenerator.js will look for CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN and use them to upload optimized images to Cloudflare Images via the Cloudflare Images API.
- If these environment variables are missing or uploads fail, the service falls back to saving optimized images locally in generated-images/ and returns local preview paths.

Testing & verification
1. Deploy frontend & server and ensure server is reachable from the frontend.
2. Create a blog via the UI, set Number of Images > 0.
3. Check server logs for Cloudflare upload success messages.
4. Confirm POST /api/blog/generate returns images array with https:// Cloudflare URLs.
5. Preview should show the images; Download HTML should fetch those URLs and embed them as data URIs.

Notes & recommendations
- Keep imageCount moderate (1–6) to avoid long-running requests and memory pressure during image optimization.
- If you plan to use Cloudflare Workers as the only runtime, move image optimization to an external Node service (recommended).
- Rotate tokens periodically and use scoped tokens (least privilege).

Files added/updated
- .env.example (lists the names of environment variables to configure)
- DEPLOY_CLOUDFLARE.md (this file) — deployment steps and notes

If you want, I can open a PR with these files added to your repository and include a merge-ready PR description and a checklist for deployment. I can also add a small script to the repo to validate environment variables at startup.
