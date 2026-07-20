/**
 * Simple Image Generator for Cloudflare
 * Uses free placeholder images (you can upgrade later)
 */
class ImageGenerator {
  async generateImages(niche, topic, imageCount = 5) {
    console.log(`🎨 Generating ${imageCount} images for ${niche}: ${topic}`);
    
    const images = [];
    
    for (let i = 0; i < imageCount; i++) {
      const imageId = `${niche}-${Date.now()}-${i}`;
      images.push({
        id: imageId,
        url: `https://picsum.photos/id/${100 + i}/1200/630`, // Free high-quality random images
        previewLink: `#`,
        prompt: `Professional image for ${topic} in ${niche} niche`,
        index: i
      });
    }
    
    return images;
  }
}

module.exports = new ImageGenerator();
