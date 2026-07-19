/**
 * Image Generation Service
 * Handles AI-powered image creation with professional prompting
 */

const Replicate = require('replicate');
const { generateImagePrompt } = require('../utils/prompts');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const FormData = require('form-data');

// Prefer tokens injected by Cloudflare environment if present
const replicateAuth = process.env.REPLICATE_API_TOKEN || process.env.CLOUDFLARE_REPLICATE_API_TOKEN || process.env.CF_REPLICATE_TOKEN || process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || null;

const replicate = new Replicate({ auth: replicateAuth });

class ImageGenerator {
  constructor() {
    this.imageDir = path.join(process.cwd(), 'generated-images');
    this.initializeImageDirectory();
    // Cloudflare Images config (optional)
    this.cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || null;
    this.cfApiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || null;
  }

  async initializeImageDirectory() {
    try {
      await fs.mkdir(this.imageDir, { recursive: true });
    } catch (error) {
      console.error('Error creating image directory:', error);
    }
  }

  async generateImages(niche, topic, imageCount = 5) {
    try {
      console.log(`🎨 Generating ${imageCount} images for ${niche}: ${topic}`);
      const images = [];

      for (let i = 0; i < imageCount; i++) {
        try {
          const prompt = generateImagePrompt(niche, topic, i);
          console.log(`  📸 Generating image ${i + 1}/${imageCount}...`);

          const imageUrl = await this.generateImageWithReplicate(prompt);
          const imageId = `${niche}-${Date.now()}-${i}`;
          const savedUrlOrPath = await this.saveAndOptimizeImage(imageUrl, imageId);

          // If Cloudflare Images was used, savedUrlOrPath will be a public URL string
          // Otherwise it's a local filesystem path; construct preview and public path accordingly
          if (this.cfAccountId && this.cfApiToken && typeof savedUrlOrPath === 'string' && savedUrlOrPath.startsWith('http')) {
            images.push({
              id: imageId,
              url: savedUrlOrPath,
              previewLink: savedUrlOrPath,
              prompt,
              index: i
            });
          } else {
            // savedUrlOrPath is local path like /path/to/generated-images/id.webp
            const webPath = `/images/${imageId}.webp`;
            images.push({
              id: imageId,
              url: webPath,
              previewLink: `/preview/${imageId}`,
              prompt,
              index: i
            });
          }

          console.log(`  ✅ Image ${i + 1} generated and optimized`);
        } catch (error) {
          console.error(`Error generating image ${i + 1}:`, error);
          // Continue with next image instead of failing entire batch
          images.push({
            id: `placeholder-${i}`,
            url: 'https://via.placeholder.com/1200x630?text=Image+Generation+Failed',
            previewLink: `/preview/placeholder-${i}`,
            error: error.message,
            index: i
          });
        }
      }

      return images;
    } catch (error) {
      console.error('Image generation error:', error);
      throw new Error(`Failed to generate images: ${error.message}`);
    }
  }

  async generateImageWithReplicate(prompt) {
    try {
      // Using Stable Diffusion v3 or similar model via Replicate
      const output = await replicate.run(
        'stability-ai/stable-diffusion-3',
        {
          input: {
            prompt: prompt,
            aspect_ratio: '16:9',
            output_format: 'webp',
            num_inference_steps: 50,
            guidance_scale: 7.5
          },
          wait: { interval: 500 }
        }
      );

      // Output is typically an array of URLs or a single URL
      const imageUrl = Array.isArray(output) ? output[0] : output;
      return imageUrl;
    } catch (error) {
      console.error('Replicate API error:', error);
      throw error;
    }
  }

  async saveAndOptimizeImage(imageUrl, imageId) {
    try {
      // Download image
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Save original
      const originalPath = path.join(this.imageDir, `${imageId}.original.png`);
      await fs.writeFile(originalPath, buffer);

      // Optimize to WebP
      const webpPath = path.join(this.imageDir, `${imageId}.webp`);
      await sharp(buffer)
        .resize(1200, 630, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toFile(webpPath);

      // Generate AVIF for modern browsers
      const avifPath = path.join(this.imageDir, `${imageId}.avif`);
      await sharp(buffer)
        .resize(1200, 630, { fit: 'cover', position: 'center' })
        .avif({ quality: 75 })
        .toFile(avifPath);

      // Generate thumbnail
      const thumbPath = path.join(this.imageDir, `${imageId}-thumb.webp`);
      await sharp(buffer)
        .resize(400, 225, { fit: 'cover', position: 'center' })
        .webp({ quality: 70 })
        .toFile(thumbPath);

      console.log(`✅ Optimized and saved: ${imageId}`);

      // If Cloudflare Images is configured, upload the optimized webp and return its public URL
      if (this.cfAccountId && this.cfApiToken) {
        try {
          const publicUrl = await this.uploadToCloudflareImages(webpPath, imageId);
          if (publicUrl) return publicUrl;
        } catch (uploadErr) {
          console.error('Failed to upload to Cloudflare Images, falling back to local files:', uploadErr);
        }
      }

      return webpPath;
    } catch (error) {
      console.error('Error saving/optimizing image:', error);
      throw error;
    }
  }

  async uploadToCloudflareImages(filePath, filename) {
    try {
      // filePath is local filesystem path; create form-data
      const stat = fsSync.statSync(filePath);
      const stream = fsSync.createReadStream(filePath);

      const form = new FormData();
      form.append('file', stream, { filename: `${filename}.webp` });
      // optional metadata
      form.append('metadata', JSON.stringify({ originalFilename: filename }));

      const url = `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/images/v1`;
      const headers = Object.assign({ Authorization: `Bearer ${this.cfApiToken}` }, form.getHeaders());

      const resp = await axios.post(url, form, { headers, maxContentLength: Infinity, maxBodyLength: Infinity });
      if (resp && resp.data && resp.data.success && resp.data.result) {
        // result.variants is an array of public URLs for different variants
        const variants = resp.data.result.variants || [];
        if (variants.length > 0) return variants[0];
        // fallback: construct delivery URL (imagedelivery.net) if possible
        if (resp.data.result && resp.data.result.id) {
          return `https://imagedelivery.net/${this.cfAccountId}/${resp.data.result.id}/public`; // best-effort
        }
      }

      throw new Error('Cloudflare Images upload did not return a usable URL');
    } catch (err) {
      console.error('Cloudflare Images upload error:', err.response ? err.response.data : err.message);
      throw err;
    }
  }

  async getImagePreview(imageId) {
    try {
      const webpPath = path.join(this.imageDir, `${imageId}.webp`);
      if (fsSync.existsSync(webpPath)) {
        const buffer = await fs.readFile(webpPath);
        return buffer;
      }

      throw new Error('Image not found');
    } catch (error) {
      console.error('Error retrieving image preview:', error);
      throw new Error('Image not found');
    }
  }

  generateImageAltText(niche, index) {
    const altTexts = {
      cryptocurrency: [
        'Bitcoin blockchain technology visualization',
        'Ethereum network illustration',
        'Cryptocurrency trading dashboard',
        'Digital wallet security concept',
        'Blockchain transaction visualization'
      ],
      artificial_intelligence: [
        'AI neural network visualization',
        'Machine learning algorithm illustration',
        'Data science workspace',
        'AI assistant interface',
        'Artificial intelligence concept'
      ],
      cybersecurity: [
        'Digital security shield protecting data',
        'Cybersecurity threat prevention concept',
        'Encryption padlock illustration',
        'Network security infrastructure',
        'Data protection visualization'
      ]
    };

    const nicheAltTexts = altTexts[niche] || [
      `${niche} concept illustration`,
      `${niche} related image`,
      `${niche} visual representation`
    ];

    return nicheAltTexts[index % nicheAltTexts.length];
  }
}

module.exports = new ImageGenerator();
