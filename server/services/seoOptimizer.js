/**
 * SEO Optimizer Service
 * Handles SEO analysis, optimization, and scoring
 */

const {
  generateSlug,
  calculateFleschScore,
  calculateKeywordDensity,
  extractHeadings,
  validateHeadingHierarchy,
  extractImageAltTexts,
  validateNoFabrication
} = require('../utils/helpers');

class SEOOptimizer {
  analyzeSEO(htmlContent, title, metaDescription, keyword, niche) {
    const analysis = {
      score: 0,
      issues: [],
      warnings: [],
      improvements: [],
      details: {}
    };

    // 1. Title Analysis (15 points)
    const titleScore = this.analyzeTitle(title, keyword);
    analysis.score += titleScore.score;
    analysis.issues.push(...titleScore.issues);
    analysis.warnings.push(...titleScore.warnings);
    analysis.details.title = titleScore;

    // 2. Meta Description Analysis (10 points)
    const metaScore = this.analyzeMetaDescription(metaDescription, keyword);
    analysis.score += metaScore.score;
    analysis.issues.push(...metaScore.issues);
    analysis.warnings.push(...metaScore.warnings);
    analysis.details.metaDescription = metaScore;

    // 3. Heading Structure (15 points)
    const headings = extractHeadings(htmlContent);
    const headingScore = this.analyzeHeadings(headings, keyword);
    analysis.score += headingScore.score;
    analysis.issues.push(...headingScore.issues);
    analysis.details.headings = headingScore;

    // 4. Content Quality (20 points)
    const contentScore = this.analyzeContent(htmlContent, keyword);
    analysis.score += contentScore.score;
    analysis.issues.push(...contentScore.issues);
    analysis.warnings.push(...contentScore.warnings);
    analysis.details.content = contentScore;

    // 5. Keyword Usage (15 points)
    const keywordScore = this.analyzeKeywordUsage(htmlContent, keyword);
    analysis.score += keywordScore.score;
    analysis.warnings.push(...keywordScore.warnings);
    analysis.details.keywords = keywordScore;

    // 6. Images (10 points)
    const imageScore = this.analyzeImages(htmlContent);
    analysis.score += imageScore.score;
    analysis.issues.push(...imageScore.issues);
    analysis.details.images = imageScore;

    // 7. Readability (10 points)
    const readabilityScore = this.analyzeReadability(htmlContent);
    analysis.score += readabilityScore.score;
    analysis.warnings.push(...readabilityScore.warnings);
    analysis.details.readability = readabilityScore;

    // 8. Anti-fabrication (5 points)
    const fabricationScore = this.analyzeFabrication(htmlContent);
    analysis.score += fabricationScore.score;
    analysis.issues.push(...fabricationScore.issues);
    analysis.details.fabrication = fabricationScore;

    // Cap score at 100
    analysis.score = Math.min(100, Math.round(analysis.score));

    return analysis;
  }

  analyzeTitle(title, keyword) {
    const score = { score: 0, issues: [], warnings: [] };

    if (!title) {
      score.issues.push('Missing title');
      return score;
    }

    // Check length (50-60 chars ideal)
    if (title.length < 30) {
      score.warnings.push('Title is too short (< 30 chars)');
      score.score += 7;
    } else if (title.length > 70) {
      score.warnings.push('Title is too long (> 70 chars)');
      score.score += 10;
    } else if (title.length >= 50 && title.length <= 60) {
      score.score += 15;
    } else {
      score.score += 12;
    }

    // Check keyword position
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      if (title.toLowerCase().indexOf(keyword.toLowerCase()) < 5) {
        score.score += (score.score === 0 ? 8 : 0); // Bonus for early keyword
      }
    } else {
      score.warnings.push('Primary keyword not in title');
    }

    return score;
  }

  analyzeMetaDescription(metaDescription, keyword) {
    const score = { score: 0, issues: [], warnings: [] };

    if (!metaDescription) {
      score.issues.push('Missing meta description');
      return score;
    }

    // Check length (150-160 chars ideal)
    if (metaDescription.length < 120) {
      score.warnings.push('Meta description is too short (< 120 chars)');
      score.score += 5;
    } else if (metaDescription.length > 170) {
      score.warnings.push('Meta description is too long (> 170 chars)');
      score.score += 7;
    } else {
      score.score += 10;
    }

    // Check keyword
    if (!metaDescription.toLowerCase().includes(keyword.toLowerCase())) {
      score.warnings.push('Keyword not in meta description');
    }

    return score;
  }

  analyzeHeadings(headings, keyword) {
    const score = { score: 0, issues: [], warnings: [] };

    if (headings.length === 0) {
      score.issues.push('No headings found');
      return score;
    }

    // Check hierarchy
    const validation = validateHeadingHierarchy(headings);
    if (!validation.valid) {
      score.issues.push(...validation.issues);
      score.score += 8;
    } else {
      score.score += 15;
    }

    // Check H1
    const h1s = headings.filter(h => h.level === 1);
    if (h1s.length === 0) {
      score.issues.push('Missing H1 heading');
    } else if (h1s.length > 1) {
      score.issues.push('Multiple H1 headings found');
    }

    // Check keyword in headings
    const keywordInHeadings = headings.some(h => 
      h.text.toLowerCase().includes(keyword.toLowerCase())
    );
    if (!keywordInHeadings) {
      score.warnings.push('Keyword not in any heading');
    }

    return score;
  }

  analyzeContent(htmlContent, keyword) {
    const score = { score: 0, issues: [], warnings: [] };

    // Remove HTML tags
    const cleanText = htmlContent.replace(/<[^>]+>/g, '');
    const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;

    // Word count
    if (wordCount < 300) {
      score.issues.push(`Content too short (${wordCount} words, minimum 300 recommended)`);
      score.score += 5;
    } else if (wordCount < 1000) {
      score.warnings.push(`Content could be longer (${wordCount} words)`);
      score.score += 10;
    } else if (wordCount >= 2500) {
      score.score += 20;
    } else {
      score.score += 15;
    }

    // Fabrication check
    const fabricationCheck = validateNoFabrication(htmlContent);
    if (fabricationCheck.needsVerification) {
      score.warnings.push('Some statistics should be verified or cited');
    }

    return score;
  }

  analyzeKeywordUsage(htmlContent, keyword) {
    const score = { score: 0, warnings: [] };

    const density = calculateKeywordDensity(htmlContent, keyword);

    if (density < 0.5) {
      score.warnings.push(`Keyword density too low (${density.toFixed(2)}%, aim for 1-2%)`);
      score.score += 8;
    } else if (density > 3) {
      score.warnings.push(`Keyword density too high (${density.toFixed(2)}%, aim for 1-2%)`);
      score.score += 8;
    } else {
      score.score += 15;
    }

    return score;
  }

  analyzeImages(htmlContent) {
    const score = { score: 0, issues: [] };

    const images = extractImageAltTexts(htmlContent);

    if (images.length === 0) {
      score.issues.push('No images found in content');
      return score;
    }

    const missingAltCount = images.filter(img => !img.hasAlt).length;
    if (missingAltCount > 0) {
      score.issues.push(`${missingAltCount} images missing alt text`);
      const altPercentage = (images.length - missingAltCount) / images.length;
      score.score += Math.round(altPercentage * 10);
    } else {
      score.score += 10;
    }

    return score;
  }

  analyzeReadability(htmlContent) {
    const score = { score: 0, warnings: [] };

    const fleschScore = calculateFleschScore(htmlContent);

    if (fleschScore >= 60 && fleschScore <= 70) {
      score.score += 10;
    } else if (fleschScore >= 50 && fleschScore <= 80) {
      score.score += 8;
    } else if (fleschScore >= 40 && fleschScore <= 90) {
      score.score += 6;
      score.warnings.push(`Flesch score ${fleschScore} - consider simplifying language`);
    } else {
      score.score += 2;
      score.warnings.push(`Flesch score ${fleschScore} - content is too complex or too simple`);
    }

    return score;
  }

  analyzeFabrication(htmlContent) {
    const score = { score: 0, issues: [] };

    const fabricationCheck = validateNoFabrication(htmlContent);

    if (!fabricationCheck.needsVerification) {
      score.score += 5;
    } else {
      score.issues.push(`${fabricationCheck.issues.length} statistics should be verified`);
      score.score += 2;
    }

    return score;
  }

  generateSEOReport(analysis, title, metaDescription, keyword) {
    return {
      score: analysis.score,
      grade: this.getGrade(analysis.score),
      summary: this.generateSummary(analysis),
      recommendations: this.generateRecommendations(analysis),
      details: analysis.details
    };
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  generateSummary(analysis) {
    const parts = [];
    if (analysis.issues.length > 0) {
      parts.push(`${analysis.issues.length} critical issues found`);
    }
    if (analysis.warnings.length > 0) {
      parts.push(`${analysis.warnings.length} warnings`);
    }
    if (parts.length === 0) {
      parts.push('No major issues detected');
    }
    return parts.join(', ');
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.issues.length > 0) {
      recommendations.push({
        priority: 'high',
        issues: analysis.issues
      });
    }

    if (analysis.warnings.length > 0) {
      recommendations.push({
        priority: 'medium',
        issues: analysis.warnings
      });
    }

    return recommendations;
  }
}

module.exports = new SEOOptimizer();
