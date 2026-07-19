import React, { useState, useEffect } from 'react';
import { FiLoader, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

const NICHES = [
  { id: 'cryptocurrency', label: 'Cryptocurrency' },
  { id: 'artificial_intelligence', label: 'Artificial Intelligence' },
  { id: 'cybersecurity', label: 'Cybersecurity' },
  { id: 'personal_finance', label: 'Personal Finance' },
  { id: 'digital_marketing', label: 'Digital Marketing' },
  { id: 'software_development', label: 'Software Development' },
  { id: 'real_estate', label: 'Real Estate' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'blockchain', label: 'Blockchain' },
  { id: 'renewable_energy', label: 'Renewable Energy' },
  { id: 'technology', label: 'Technology' },
  { id: 'health', label: 'Health' },
  { id: 'finance', label: 'Finance' },
  { id: 'sports', label: 'Sports' },
  { id: 'travel', label: 'Travel' },
  { id: 'food', label: 'Food' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'business', label: 'Business' },
  { id: 'science', label: 'Science' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'psychology', label: 'Psychology' },
  { id: 'education', label: 'Education' },
  { id: 'automotive', label: 'Automotive' }
];

const Dashboard = () => {
  const [selectedNiche, setSelectedNiche] = useState('cryptocurrency');
  const [imageCount, setImageCount] = useState(5);
  const [keyword, setKeyword] = useState('');
  const [keywordsList, setKeywordsList] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]); // array of strings
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(null);

  useEffect(() => {
    // Load keywords from server
    fetch('/api/keywords')
      .then(r => r.json())
      .then(j => {
        if (j && Array.isArray(j.keywords)) setKeywordsList(j.keywords);
      })
      .catch(() => {
        // ignore; keep inline keywords as fallback
      });
  }, []);

  const toggleKeyword = (kw) => {
    setSelectedKeywords(prev => {
      const s = new Set(prev);
      if (s.has(kw)) s.delete(kw);
      else s.add(kw);
      return Array.from(s);
    });
  };

  const handleGenerateBlog = async (e) => {
    e.preventDefault();

    // if no selected keywords, fall back to free-text keyword input
    const finalKeywords = (selectedKeywords && selectedKeywords.length > 0)
      ? selectedKeywords
      : (keyword.trim() ? [keyword.trim()] : []);

    if (finalKeywords.length === 0) {
      toast.error('Please select at least one keyword or enter one.');
      return;
    }

    setLoading(true);
    setProgress(10);
    setStatusMessage('Starting generation...');
    setGeneratedContent(null);

    try {
      setProgress(30);
      setStatusMessage('Calling AI model...');

      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: selectedNiche,
          keywords: finalKeywords,
          imageCount: Number(imageCount)
        })
      });

      setProgress(70);
      setStatusMessage('Processing response...');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Generation failed');
      }

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      // data.content contains HTML with <!--IMG_n--> placeholders and ad placeholders
      // data.images is an array of image URLs/dataURIs
      let finalHtml = data.content || data.contentBody || '<p>No content</p>';

      // If images are URLs, we embed them directly into the final downloadable HTML when user clicks Download.
      // For preview, replace placeholders with img tags using the returned image URLs (non-embedded)
      if (Array.isArray(data.images)) {
        data.images.forEach((imgUrl, i) => {
          finalHtml = finalHtml.replace(`<!--IMG_${i}-->`, imgUrl ? `<img src="${imgUrl}" alt="image-${i+1}" style="max-width:100%;margin:16px 0;"/>` : '');
        });
      }

      setGeneratedContent({
        title: data.title || finalKeywords.join(' '),
        content: finalHtml,
        metaDescription: data.metaDescription || `AI-generated blog about ${finalKeywords.join(', ')}`,
        wordCount: data.wordCount || (finalHtml.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length),
        seoReport: data.seoReport || { score: 0, grade: '-', details: { readability: { score: 0 } } },
        images: data.images || [],
        slug: data.slug || finalKeywords.join('-').replace(/\s+/g, '-').toLowerCase(),
        generatedAt: data.generatedAt || new Date().toISOString(),
        metaTags: data.metaTags || {},
        schema: data.schema || {}
      });

      setProgress(100);
      setStatusMessage('Done!');
      toast.success('Blog generated successfully!');
    } catch (error) {
      toast.error('Failed to generate blog: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Utility: convert image URL to data URI for embedding into downloaded HTML
  async function urlToDataURL(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('Image fetch failed');
      const blob = await r.blob();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // Download the generated content as self-contained HTML (images embedded as data URIs)
  const downloadHTML = async () => {
    if (!generatedContent) return;

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${generatedContent.metaDescription}">
  <title>${generatedContent.title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.6; color:#333; background:#f5f5f5; }
    article { max-width:900px; margin:0 auto; padding:40px 20px; background:white; }
    .ad-placeholder{width:300px;height:250px;border:1px dashed #ccc;text-align:center;line-height:250px;color:#888;margin:20px auto;}
    img { max-width:100%; height:auto; display:block; margin:16px 0; }
  </style>
</head>
<body>
  <article>
    <h1>${generatedContent.title}</h1>
    <div class="meta">
      <p><strong>Published:</strong> ${new Date(generatedContent.generatedAt).toLocaleDateString()}</p>
      <p><strong>Word count:</strong> ${generatedContent.wordCount.toLocaleString()}</p>
    </div>
    <div class="post-content">
      ${generatedContent.content}
    </div>
  </article>
</body>
</html>`.trim();

    // embed images as data URIs for self-contained HTML
    if (generatedContent.images && generatedContent.images.length > 0) {
      const dataUris = await Promise.all(generatedContent.images.map(url => urlToDataURL(url)));
      dataUris.forEach((dataUrl, i) => {
        if (dataUrl) {
          html = html.replace(new RegExp(`(<img[^>]*src=["']?)${escapeRegExp(generatedContent.images[i])}(["'][^>]*>)`, 'g'), `$1${dataUrl}$2`);
          // Also fallback: replace placeholders if any remain
          html = html.replace(`<!--IMG_${i}-->`, `<img src="${dataUrl}" alt="image-${i+1}"/>`);
        } else {
          html = html.replace(`<!--IMG_${i}-->`, '');
        }
      });
    }

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedContent.slug}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Blog downloaded!');
  };

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // rest of the JSX structure: form + keyword selector UI
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white mb-2">🚀 Blog Generator</h1>
          <p className="text-gray-400">Automatic SEO-optimized blog post generation with AI</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-dark-card border border-dark-border rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-white mb-6">⚙️ Configuration</h2>

              <form onSubmit={handleGenerateBlog} className="space-y-4">
                {/* Niche Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Niche</label>
                  <select value={selectedNiche} onChange={(e) => setSelectedNiche(e.target.value)} disabled={loading}
                    className="w-full bg-dark-bg border border-dark-border text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                    {NICHES.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>

                {/* Keyword Picker (click to select from repo keywords) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pick Keywords (click to select)</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-auto p-2 bg-dark-bg rounded border border-dark-border">
                    {(keywordsList.length > 0 ? keywordsList : ['example keyword']).map(kw => {
                      const active = selectedKeywords.includes(kw);
                      return (
                        <button key={kw} type="button" onClick={() => toggleKeyword(kw)}
                          className={`px-3 py-1 rounded text-sm ${active ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-300 border border-dark-border'}`}>
                          {kw}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Or enter custom keyword below.</p>
                </div>

                {/* Keyword Input (fallback) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Focus Keyword (optional)</label>
                  <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} disabled={loading}
                    placeholder="e.g., how to invest in bitcoin"
                    className="w-full bg-dark-bg border border-dark-border text-white rounded px-3 py-2" />
                </div>

                {/* Image Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Number of Images: {imageCount}</label>
                  <input type="range" min="1" max="6" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} disabled={loading}
                    className="w-full" />
                </div>

                {/* Generate Button */}
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                  {loading ? <><FiLoader className="animate-spin" /> Generating ({progress}%)</> : '✨ Generate Blog' }
                </button>

                {/* Download Button */}
                {generatedContent && (
                  <button type="button" onClick={downloadHTML} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 mt-2">
                    <FiDownload /> Download HTML
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-2 space-y-6">
            {generatedContent ? (
              <> 
                <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-h-96 overflow-y-auto">
                  <h1 className="text-3xl font-bold text-white mb-4">{generatedContent.title}</h1>
                  <p className="text-gray-400 mb-6 pb-4 border-b border-dark-border">{generatedContent.metaDescription}</p>
                  <div className="text-gray-300 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: generatedContent.content }} />
                </div>
              </>
            ) : (
              <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
                <p className="text-gray-400 text-lg">👈 Configure and generate a blog post to see preview</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
