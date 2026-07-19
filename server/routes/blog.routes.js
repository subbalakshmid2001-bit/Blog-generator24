/**
 * Blog Routes
 */

const express = require('express');
const router = express.Router();
const contentGenerator = require('../services/contentGenerator');
const imageGenerator = require('../services/imageGenerator');
const seoOptimizer = require('../services/seoOptimizer');
const schemaGenerator = require('../services/schemaGenerator');
const newsService = require('../services/newsService');
const { generateSlug } = require('../utils/helpers');

/**
 * POST /api/blog/generate
 * Expects: { niche: string, keywords: [string], imageCount?: number, language?: string }
 * Returns JSON: { title, slug, metaDescription, content, images, schema, seoReport, metaTags, hreflang, ... }
 */
router.post('/generate', async (req, res) => {
  try {
    const { niche, keywords = [], imageCount = 5, language = 'en' } = req.body;

    if (!niche || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Niche and keywords array are required' });
    }

    console.log(`\n🚀 Starting blog generation for ${niche}: [${keywords.join(', ')}]`);

    // Step 1: Fetch news context
    console.log('📰 Step 1: Fetching news...');
    const news = await newsService.getNewsForNiche(niche, 5);
    const newsContext = await newsService.formatNewsContext(news);

    // Step 2: Generate blog content (adapted to accept keywords array)
    console.log('✍️  Step 2: Generating blog content...');
    const contentResult = await contentGenerator.generateBlogContent(niche, keywords, newsContext, imageCount);
    let htmlContent = contentResult.html || '<p>No content generated.</p>';

    // Step 3: Generate title & slug
    console.log('📝 Step 3: Generating SEO title...');
    const title = await contentGenerator.generateTitle(niche, keywords.join(' '));
    const slug = generateSlug(title);

    // Step 4: Generate meta description
    console.log('📄 Step 4: Generating meta description...');
    const metaDescription = await contentGenerator.generateMetaDescription(htmlContent, keywords.join(' '));

    // Step 5: Generate images (returns array of URLs or data URIs)
    console.log('🎨 Step 5: Generating images...');
    const count = Math.max(0, Math.min(10, parseInt(imageCount, 10) || 0)); // safe limits
    const images = await imageGenerator.generateImages(niche, keywords.join(', '), count);

    // Insert image placeholders into the content: <!--IMG_0-->, <!--IMG_1-->, ...
    // Strategy: insert placeholders at reasonable spots (after first N paragraphs) or append if not enough paragraphs.
    for (let i = 0; i < images.length; i++) {
      const placeholder = `<!--IMG_${i}-->`;
      // Try to insert after nth <p>. If not found, append at end of content
      const pMatches = htmlContent.match(/<\/p>/gi);
      if (pMatches && pMatches.length >= i + 1) {
        // Insert after the (i+1)-th </p>
        let insertIndex = nthIndexOf(htmlContent, '</p>', i + 1);
        if (insertIndex !== -1) {
          const before = htmlContent.slice(0, insertIndex + 4);
          const after = htmlContent.slice(insertIndex + 4);
          htmlContent = before + `\n${placeholder}\n` + after;
          continue;
        }
      }
      // fallback: append placeholder at end of content body
      htmlContent = htmlContent + `\n${placeholder}\n`;
    }

    // Prepare three identical advertisement placeholders
    const adPlaceholderHtml = `<div class="ad-placeholder" data-ad-slot="" data-ad-url="">AD_PLACEHOLDER</div>`;
    // Insert ad placeholders in three spots:
    // 1) after first paragraph
    // 2) after second paragraph (or after first if only one)
    // 3) before closing of article/body (append)
    htmlContent = insertAdAfterNthParagraph(htmlContent, adPlaceholderHtml, 1);
    htmlContent = insertAdAfterNthParagraph(htmlContent, adPlaceholderHtml, 2);
    htmlContent = htmlContent + `\n${adPlaceholderHtml}\n`;

    // Step 6: Generate schema
    console.log('🏗️  Step 6: Generating schema markup...');
    const canonicalUrl = `https://blog-generator.com/blog/${slug}/`;
    const schema = await contentGenerator.generateSchemaMarkup(
      htmlContent,
      title,
      keywords.join(', '),
      'Blog Generator',
      new Date().toISOString()
    );

    // Step 7: SEO Analysis
    console.log('🔍 Step 7: Analyzing SEO...');
    const seoAnalysis = seoOptimizer.analyzeSEO(
      htmlContent,
      title,
      metaDescription,
      keywords.join(', '),
      niche
    );
    const seoReport = seoOptimizer.generateSEOReport(seoAnalysis, title, metaDescription, keywords.join(', '));

    // Step 8: Meta tags and hreflang
    console.log('🌐 Step 8: Generating meta tags...');
    const metaTags = schemaGenerator.generateHtmlMeta({
      title,
      description: metaDescription,
      keyword: keywords.join(', '),
      author: 'Blog Generator',
      canonicalUrl,
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString()
    });

    const hreflang = schemaGenerator.generateHreflang(
      'https://blog-generator.com',
      slug,
      ['en', 'es', 'fr', 'de', 'zh']
    );

    console.log('✅ Blog generation complete!');

    // Final response: return the full HTML content (with placeholders) and images[] so client can embed them
    return res.json({
      title,
      slug,
      metaDescription,
      content: htmlContent,
      images, // array length == imageCount (or fewer on partial failures)
      schema,
      seoReport,
      metaTags,
      hreflang,
      niche,
      keywords,
      language,
      generatedAt: new Date().toISOString(),
      wordCount: contentResult.metadata ? contentResult.metadata.wordCount : (htmlContent.split(/\s+/).length)
    });
  } catch (error) {
    console.error('Error in blog generation:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * helper: find nth index of substring
 */
function nthIndexOf(str, pat, n) {
  let i = -1;
  while (n-- && i++ < str.length) {
    i = str.indexOf(pat, i);
    if (i === -1) return -1;
  }
  return i;
}

/**
 * helper: insert ad placeholder after nth </p>
 */
function insertAdAfterNthParagraph(html, adHtml, n) {
  const idx = nthIndexOf(html, '</p>', n);
  if (idx !== -1) {
    const before = html.slice(0, idx + 4);
    const after = html.slice(idx + 4);
    return before + `\n${adHtml}\n` + after;
  }
  // fallback: append near end
  return html + `\n${adHtml}\n`;
}

module.exports = router;
