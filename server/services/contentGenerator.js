/**
 * Content Generation Service
 * Handles AI-powered blog content creation with SEO optimization
 */

const { OpenAI } = require('openai');
const { generateBlogPrompt, generateSchemaPrompt } = require('../utils/prompts');
const {
  generateSlug,
  generateMetaDescription,
  calculateFleschScore,
  calculateKeywordDensity,
  extractHeadings,
  validateHeadingHierarchy,
  validateNoFabrication
} = require('../utils/helpers');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ContentGenerator {
  async generateBlogContent(niche, keyword, newsContext, imageCount = 5) {
    try {
      console.log(`🎯 Generating blog content for ${niche}: "${keyword}"`);
      
      const prompt = generateBlogPrompt(niche, keyword, newsContext, imageCount);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO content writer and blogger. Create comprehensive, well-researched, and SEO-optimized blog posts. Return valid HTML with proper semantic structure. Never fabricate statistics or data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
        top_p: 0.9
      });
      
      const htmlContent = response.choices[0].message.content;
      
      // Extract and validate structure
      const headings = extractHeadings(htmlContent);
      const headingValidation = validateHeadingHierarchy(headings);
      const fleschScore = calculateFleschScore(htmlContent);
      const keywordDensity = calculateKeywordDensity(htmlContent, keyword);
      const fabricationCheck = validateNoFabrication(htmlContent);
      
      console.log(`✅ Content generated: ${headings.length} headings, Flesch: ${fleschScore}, Keyword density: ${keywordDensity}%`);
      
      return {
        html: htmlContent,
        metadata: {
          fleschScore,
          keywordDensity,
          headingValidation,
          fabricationCheck,
          wordCount: this.calculateWordCount(htmlContent)
        }
      };
    } catch (error) {
      console.error('Content generation error:', error);
      throw new Error(`Failed to generate blog content: ${error.message}`);
    }
  }

  async generateTitle(niche, keyword, maxLength = 60) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing SEO-optimized blog titles. Generate compelling titles that start with the keyword, are under the specified character limit, and follow SEO best practices.'
          },
          {
            role: 'user',
            content: `Generate a blog title for a ${niche} article about "${keyword}" (max ${maxLength} characters). Return ONLY the title, nothing else.`
          }
        ],
        temperature: 0.8,
        max_tokens: 100
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Title generation error:', error);
      throw error;
    }
  }

  async generateMetaDescription(content, keyword, maxLength = 160) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate compelling, SEO-optimized meta descriptions that encourage clicks. Include the primary keyword naturally. Return ONLY the meta description.'
          },
          {
            role: 'user',
            content: `Generate a meta description for a blog post about "${keyword}" (max ${maxLength} chars). Here's the content preview: ${content.substring(0, 500)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Meta description error:', error);
      throw error;
    }
  }

  async generateSchemaMarkup(content, title, keyword, author, datePublished) {
    try {
      const prompt = generateSchemaPrompt(keyword, title, author, datePublished);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate valid JSON-LD structured data. Return ONLY valid JSON, no markdown formatting or extra text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
      
      const schemaText = response.choices[0].message.content;
      
      // Parse and validate JSON
      try {
        const schema = JSON.parse(schemaText);
        return schema;
      } catch (e) {
        console.warn('Failed to parse schema JSON, returning raw:', schemaText);
        return { raw: schemaText, error: 'Failed to parse' };
      }
    } catch (error) {
      console.error('Schema generation error:', error);
      throw error;
    }
  }

  calculateWordCount(htmlContent) {
    // Remove HTML tags
    const cleanText = htmlContent.replace(/<[^>]+>/g, '');
    // Split by whitespace and filter empty strings
    const words = cleanText.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  async generateTableOfContents(htmlContent) {
    const headings = extractHeadings(htmlContent);
    return headings.filter(h => h.level > 1).map((h, idx) => ({
      id: h.id || `heading-${idx}`,
      text: h.text,
      level: h.level
    }));
  }
}

module.exports = new ContentGenerator();
