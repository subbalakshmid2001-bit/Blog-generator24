# Cloudflare observability

This file documents the observability settings configured in wrangler.jsonc. These settings enable invocation logs to be persisted while keeping traces disabled by default.

Key points:
- logs.enabled: true — worker logs are enabled
- logs.persist: true — keep logs persisted in Cloudflare
- traces.enabled: false — tracing disabled by default (enable only if needed)

Adjust these values in wrangler.jsonc if you want different sampling/retention behavior.
