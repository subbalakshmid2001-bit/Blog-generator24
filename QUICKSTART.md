# Blog Generator

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- OpenAI API key
- Replicate API token

### Installation

```bash
# Clone repository
git clone https://github.com/sri20032003/blog-generator.git
cd blog-generator

# Run setup script
bash setup.sh

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development
npm run dev
```

### Access
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- API Docs: `http://localhost:5000/api-docs`

## Features

✅ **25+ Niches** - Cryptocurrency, AI, Cybersecurity, Finance, Marketing, and more
✅ **2,500-5,000+ words** - Comprehensive blog posts
✅ **SEO Optimized** - 90+ SEO score guarantee
✅ **4-6 AI Images** - Professional, niche-specific imagery
✅ **Real-time News** - RSS feeds for freshness signals
✅ **Schema Markup** - Article, FAQ, HowTo, SoftwareApplication
✅ **Zero Fabrication** - No made-up statistics
✅ **Multi-language** - hreflang support (en, es, fr, de, zh)
✅ **Image Optimization** - WebP, AVIF with fallbacks
✅ **Dark Theme** - Professional modern UI
✅ **Mobile Responsive** - Works on all devices
✅ **Flesch Score** - 60-70 readability target
✅ **Copy Preview Links** - One-click link copying
✅ **Download HTML** - Complete blog export

## Configuration

Edit `.env` file:

```env
PORT=5000
NODE_ENV=development
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=token_...
REACT_APP_API_URL=http://localhost:5000
```

## API Endpoints

### Generate Blog
```bash
POST /api/blog/generate
Content-Type: application/json

{
  "niche": "cryptocurrency",
  "keyword": "how to buy bitcoin",
  "imageCount": 5,
  "language": "en"
}
```

### Get News
```bash
GET /api/news/cryptocurrency?limit=10
```

### Generate Images
```bash
POST /api/image/generate
Content-Type: application/json

{
  "niche": "cryptocurrency",
  "topic": "bitcoin mining",
  "count": 5
}
```

### List Niches
```bash
GET /api/news/list/all
```

## Performance

- **Generation Time**: 2-5 minutes per blog
- **Image Generation**: 30-60 seconds per image
- **SEO Analysis**: Real-time
- **API Latency**: < 200ms

## Technology Stack

**Backend**
- Node.js + Express.js
- OpenAI GPT-4 API
- Replicate API (Stable Diffusion)
- RSS Parser
- Sharp (image processing)

**Frontend**
- React 18
- Tailwind CSS
- React Hot Toast
- Axios
- React Icons

## File Structure

```
blog-generator/
├── server/
│   ├── services/
│   │   ├── contentGenerator.js
│   │   ├── imageGenerator.js
│   │   ├── seoOptimizer.js
│   │   ├── schemaGenerator.js
│   │   ├── newsService.js
│   │   └── sitemapGenerator.js
│   ├── routes/
│   │   ├── blog.routes.js
│   │   ├── image.routes.js
│   │   └── news.routes.js
│   ├── utils/
│   │   ├── seoKeywords.js
│   │   ├── prompts.js
│   │   └── helpers.js
│   └── index.js
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── public/
│   └── robots.txt
├── .env.example
├── package.json
└── README.md
```

## Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

### Quick Deploy

**Frontend (Vercel)**
```bash
cd client && vercel deploy
```

**Backend (Railway)**
1. Connect GitHub repo
2. Set environment variables
3. Deploy automatically

## License

MIT License - See LICENSE file

## Support

📧 Email: support@blog-generator.com
🐛 Issues: GitHub Issues
💬 Discussions: GitHub Discussions

## Contributors

- Sri (sri20032003)

## Roadmap

- [ ] Database integration (PostgreSQL)
- [ ] User authentication
- [ ] Blog storage & retrieval
- [ ] Advanced analytics
- [ ] WordPress integration
- [ ] Scheduled generation
- [ ] API rate limiting
- [ ] Email notifications
- [ ] Multi-user support
- [ ] API key management

---

**Built with ❤️ for content creators and SEO professionals**
