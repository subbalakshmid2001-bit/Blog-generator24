# Blog Generator - Production Deployment Guide

## Environment Variables

Create a `.env` file in the root directory with these variables:

```env
# Backend Configuration
PORT=5000
NODE_ENV=production

# API Keys
OPENAI_API_KEY=your_openai_key_here
REPLICATE_API_TOKEN=your_replicate_token_here

# Frontend
REACT_APP_API_URL=https://api.blog-generator.com

# Database (optional, for storing generated blogs)
DATABASE_URL=your_database_url

# AWS S3 (optional, for image storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=blog-generator-images
```

## Installation & Setup

### Local Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start development servers
npm run dev

# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

### Production Build

```bash
# Build frontend
cd client
npm run build
cd ..

# Start production server
NODE_ENV=production npm start
```

## Deployment Options

### Option 1: Vercel (Recommended for Frontend)

```bash
cd client
npm install -g vercel
vercel deploy
```

### Option 2: Heroku (Backend)

```bash
# Install Heroku CLI
heroku login
heroku create your-app-name
heroku config:set OPENAI_API_KEY=xxx
heroku config:set REPLICATE_API_TOKEN=xxx
git push heroku main
```

### Option 3: Railway.app

1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically

### Option 4: Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

```bash
docker build -t blog-generator .
docker run -p 5000:5000 -e OPENAI_API_KEY=xxx blog-generator
```

## Performance Optimization

### Image Optimization
- Images are automatically converted to WebP/AVIF
- Implemented lazy loading for below-fold images
- Responsive srcset attributes
- CDN integration for fast delivery

### Caching
- Browser caching for static assets (1 year)
- API response caching (5 minutes)
- Generated blogs cached in database

### Database
- Index on `niche`, `keyword`, `createdAt`
- Pagination for large result sets

## Monitoring

### Logging
```bash
# View logs
tail -f logs/blog-generator.log
```

### Analytics
- Track blog generation success rate
- Monitor API response times
- Track image generation costs

## Scaling

### Horizontal Scaling
- Use load balancer (Nginx/HAProxy)
- Multiple backend instances
- Separate database for scalability

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10 // limit each IP to 10 requests per windowMs
});

app.use('/api/blog/generate', limiter);
```

## SEO Configuration

### Sitemap
- Generated at `/sitemap.xml`
- Includes all blog posts
- Updated weekly

### Robots.txt
- Configured at `/robots.txt`
- Allows all AI crawlers (GPTBot, PerplexityBot, etc.)
- Specifies sitemap location

### Canonical URLs
- Set on all generated blog posts
- Prevents duplicate content issues

## Security

### API Security
- CORS configured
- Rate limiting enabled
- Input validation on all endpoints
- API key validation

### Data Security
- HTTPS required
- Environment variables for secrets
- SQL injection prevention
- XSS protection headers

## Troubleshooting

### OpenAI API Issues
- Check API key validity
- Monitor rate limits
- Check account billing

### Image Generation Failures
- Verify Replicate API token
- Check model availability
- Monitor queue status

### Performance Issues
- Check database indexes
- Monitor API response times
- Implement caching

## Support

For issues or questions:
1. Check GitHub Issues
2. Review documentation
3. Contact support: support@blog-generator.com
