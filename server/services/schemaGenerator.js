/**
 * Schema Generator Service
 * Generates structured data (JSON-LD) for SEO
 */

const { generateCanonicalUrl } = require('../utils/helpers');

class SchemaGenerator {
  generateArticleSchema(blogData) {
    const {
      title,
      description,
      content,
      author = 'Blog Generator',
      datePublished,
      dateModified = new Date().toISOString(),
      canonicalUrl,
      image,
      keyword
    } = blogData;

    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description: description,
      author: {
        '@type': 'Person',
        name: author,
        url: canonicalUrl
      },
      datePublished: datePublished,
      dateModified: dateModified,
      image: {
        '@type': 'ImageObject',
        url: image,
        width: 1200,
        height: 630
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl
      },
      keywords: keyword,
      articleSection: 'Blog',
      inLanguage: 'en-US'
    };
  }

  generateFAQSchema(faqItems) {
    if (!faqItems || faqItems.length === 0) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    };
  }

  generateHowToSchema(steps, title, description) {
    if (!steps || steps.length === 0) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: title,
      description: description,
      step: steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.title,
        text: step.description
      }))
    };
  }

  generateBreadcrumbSchema(breadcrumbs, baseUrl) {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url || `${baseUrl}/${crumb.path}`
      }))
    };
  }

  generateOrganizationSchema(name, url, logo) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: name,
      url: url,
      logo: logo,
      sameAs: [
        'https://www.facebook.com/bloggenerator',
        'https://www.twitter.com/bloggenerator',
        'https://www.linkedin.com/company/bloggenerator'
      ]
    };
  }

  generateSoftwareApplicationSchema(appData) {
    const {
      name,
      description,
      url,
      image,
      version = '1.0.0',
      rating = 4.5,
      ratingCount = 100
    } = appData;

    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: name,
      description: description,
      url: url,
      image: image,
      applicationCategory: 'Productivity',
      softwareVersion: version,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        ratingCount: ratingCount
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      }
    };
  }

  generateListSchema(items, listType = 'ItemList') {
    return {
      '@context': 'https://schema.org',
      '@type': listType,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url,
        description: item.description
      }))
    };
  }

  combineSchemas(schemas) {
    if (schemas.length === 1) {
      return schemas[0];
    }

    return {
      '@context': 'https://schema.org',
      '@graph': schemas
    };
  }

  generateHtmlMeta(blogData) {
    const {
      title,
      description,
      keyword,
      author,
      canonicalUrl,
      language = 'en',
      datePublished,
      dateModified
    } = blogData;

    return {
      title,
      metaTags: [
        {
          name: 'description',
          content: description
        },
        {
          name: 'keywords',
          content: keyword
        },
        {
          name: 'author',
          content: author
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0'
        },
        {
          name: 'robots',
          content: 'index, follow'
        },
        {
          property: 'og:title',
          content: title
        },
        {
          property: 'og:description',
          content: description
        },
        {
          property: 'og:type',
          content: 'article'
        },
        {
          property: 'og:url',
          content: canonicalUrl
        },
        {
          property: 'twitter:card',
          content: 'summary_large_image'
        },
        {
          property: 'twitter:title',
          content: title
        },
        {
          property: 'twitter:description',
          content: description
        },
        {
          name: 'article:published_time',
          content: datePublished
        },
        {
          name: 'article:modified_time',
          content: dateModified
        }
      ],
      canonicalUrl,
      language
    };
  }

  generateHreflang(baseUrl, slug, languages = ['en', 'es', 'fr', 'de', 'zh']) {
    return languages.map(lang => ({
      rel: 'alternate',
      hreflang: lang,
      href: `${baseUrl}/${lang}/blog/${slug}/`
    }));
  }
}

module.exports = new SchemaGenerator();
