/**
 * Database Schema (for future implementation)
 * SQL schema for storing generated blogs
 */

const schema = `
-- Blogs Table
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  niche VARCHAR(50) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  meta_description VARCHAR(160),
  canonical_url VARCHAR(500),
  seo_score INT,
  word_count INT,
  flesch_score INT,
  language VARCHAR(10) DEFAULT 'en',
  author VARCHAR(255),
  published BOOLEAN DEFAULT FALSE,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX (niche),
  INDEX (keyword),
  INDEX (created_at)
);

-- Images Table
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
  image_id VARCHAR(255) UNIQUE NOT NULL,
  url VARCHAR(500) NOT NULL,
  alt_text TEXT,
  prompt TEXT,
  width INT,
  height INT,
  file_size INT,
  format VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (blog_id)
);

-- Schema Markup Table
CREATE TABLE schema_markup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE UNIQUE,
  schema_type VARCHAR(50),
  markup JSON NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SEO Analysis Table
CREATE TABLE seo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE UNIQUE,
  overall_score INT,
  title_score INT,
  meta_description_score INT,
  heading_score INT,
  content_score INT,
  keyword_score INT,
  image_score INT,
  readability_score INT,
  issues JSONB,
  recommendations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hreflang Table
CREATE TABLE hreflang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (blog_id, language)
);
`;

module.exports = schema;
