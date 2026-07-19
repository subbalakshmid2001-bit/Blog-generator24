/**
 * Sitemap Generator Service
 * Generates XML sitemap for SEO
 */

const fs = require('fs').promises;
const path = require('path');

class SitemapGenerator {
  async generateSitemap(baseUrl, pages = []) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">
${pages.map(page => this.generateUrlEntry(page)).join('\n')}
</urlset>`;

    return xml;
  }

  generateUrlEntry(page) {
    const {
      url,
      lastmod = new Date().toISOString().split('T')[0],
      changefreq = 'weekly',
      priority = 0.8,
      images = []
    } = page;

    let entry = `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>`;

    if (images && images.length > 0) {
      images.forEach(image => {
        entry += `
    <image:image>
      <image:loc>${image.url}</image:loc>
      <image:title>${image.title || ''}</image:title>
      <image:caption>${image.caption || ''}</image:caption>
    </image:image>`;
      });
    }

    entry += `
  </url>`;
    return entry;
  }

  async generateSitemapIndex(baseUrl, sitemaps = []) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${sitemap.url}</loc>
    <lastmod>${sitemap.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    return xml;
  }

  async saveSitemap(content, filename = 'sitemap.xml') {
    const sitemapDir = path.join(process.cwd(), 'public');
    await fs.mkdir(sitemapDir, { recursive: true });
    await fs.writeFile(
      path.join(sitemapDir, filename),
      content,
      'utf-8'
    );
    console.log(`✅ Sitemap saved: ${filename}`);
  }
}

module.exports = new SitemapGenerator();
