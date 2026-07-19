import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export const blogAPI = {
  generate: (niche, keyword, imageCount = 5) => {
    return api.post('/api/blog/generate', {
      niche,
      keyword,
      imageCount,
      language: 'en'
    });
  },
  
  preview: (slug) => {
    return api.get(`/api/blog/preview/${slug}`);
  }
};

export const newsAPI = {
  getForNiche: (niche, limit = 10) => {
    return api.get(`/api/news/${niche}`, { params: { limit } });
  },
  
  listAll: () => {
    return api.get('/api/news/list/all');
  }
};

export const imageAPI = {
  generate: (niche, topic, count = 5) => {
    return api.post('/api/image/generate', {
      niche,
      topic,
      count
    });
  },
  
  preview: (imageId) => {
    return api.get(`/api/image/preview/${imageId}`);
  }
};

export default api;
