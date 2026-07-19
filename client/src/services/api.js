import axios from 'axios';

const api = axios.create({
  baseURL: '',
  timeout: 60000,
});

export const blogAPI = {
  generate: (niche, keyword, imageCount = 5) => {
    return api.post('/api/generate', {
      niche,
      keyword,
      imageCount,
      language: 'en'
    });
  },
};

export default api;
