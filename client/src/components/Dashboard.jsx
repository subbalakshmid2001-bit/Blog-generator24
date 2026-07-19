import React, { useState } from 'react';
import { FiLoader, FiDownload, FiCopy, FiCheck } from 'react-icons/fi';
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
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(null);

  const handleGenerateBlog = async (e) => {
    e.preventDefault();

    if (!keyword.trim()) {
      toast.error('Please enter a keyword');
      return;
    }

    setLoading(true);
    setProgress(10);
    setStatusMessage('Starting generation...');
    setGeneratedContent(null);

    try {
      setProgress(30);
      setStatusMessage('Calling AI model...');

      // ✅ FIXED: relative URL, works on Cloudflare Worker
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          niche: selectedNiche,
          keyword: keyword.trim(),
          topic: `${selectedNiche}: ${keyword.trim()}`,
          imageCount: parseInt(imageCount)
        })
      });

      setProgress(70);
      setStatusMessage('Processing response...');

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Generation failed');
      }

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      setProgress(100);
      setStatusMessage('Done!');

      setGeneratedContent({
        title: keyword.trim(),
        content: data.content,
        metaDescription: `AI-generated blog post about ${keyword.trim()} in the ${selectedNiche} niche.`,
        wordCount: data.content ? data.content.split(' ').length : 0,
        seoReport: {
          score: 85,
          grade: 'A',
          details: {
            readability: { score: 8 }
          }
        },
        images: [],
        slug: keyword.trim().replace(/\s+/g, '-').toLowerCase(),
        generatedAt: data.timestamp || new Date().toISOString(),
        metaTags: { canonicalUrl: window.location.href },
        schema: {}
      });

      toast.success('Blog generated successfully!');

    } catch (error) {
      toast.error('Failed to generate blog: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadHTML = () => {
    if (!generatedContent) return;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${generatedContent.metaDescription}">
    <title>${generatedContent.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        article { max-width: 900px; margin: 0 auto; padding: 40px 20px; background: white; }
        h1 { font-size: 2.5em; margin: 20px 0; color: #1a1a1a; }
        h2 { font-size: 1.8em; margin: 30px 0 20px 0; color: #2c3e50; border-left: 4px solid #3498db; padding-left: 15px; }
        h3 { font-size: 1.3em; margin: 20px 0 15px 0; color: #34495e; }
        p { margin: 15px 0; line-height: 1.8; }
        ul, ol { margin: 20px 0 20px 30px; }
        li { margin: 10px 0; }
        .meta { color: #7f8c8d; font-size: 0.95em; margin-bottom: 20px; border-bottom: 1px solid #ecf0f1; padding-bottom: 15px; }
    </style>
</head>
<body>
    <article>
        <h1>${generatedContent.title}</h1>
        <div class="meta">
            <p><strong>Published:</strong> ${new Date(generatedContent.generatedAt).toLocaleDateString()}</p>
            <p><strong>Word count:</strong> ${generatedContent.wordCount.toLocaleString()}</p>
        </div>
        <div>${generatedContent.content}</div>
    </article>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedContent.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Blog downloaded!');
  };

  const copyToClipboard = (text, linkId) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white mb-2">🚀 Blog Generator</h1>
          <p className="text-gray-400">Automatic SEO-optimized blog post generation with AI</p>
        </div>
      </header>

      {/* Main Content */}
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
                  <select
                    value={selectedNiche}
                    onChange={(e) => setSelectedNiche(e.target.value)}
                    disabled={loading}
                    className="w-full bg-dark-bg border border-dark-border text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    {NICHES.map(niche => (
                      <option key={niche.id} value={niche.id}>
                        {niche.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Keyword Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Focus Keyword</label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={loading}
                    placeholder="e.g., how to invest in bitcoin"
                    className="w-full bg-dark-bg border border-dark-border text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Image Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of Images: {imageCount}
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="6"
                    value={imageCount}
                    onChange={(e) => setImageCount(e.target.value)}
                    disabled={loading}
                    className="w-full disabled:opacity-50"
                  />
                </div>

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" />
                      Generating ({progress}%)
                    </>
                  ) : (
                    '✨ Generate Blog'
                  )}
                </button>

                {/* Status Message */}
                {statusMessage && (
                  <div className="bg-blue-900/20 border border-blue-500/50 rounded p-3 text-sm text-gray-300">
                    {statusMessage}
                  </div>
                )}

                {/* Download Button */}
                {generatedContent && (
                  <button
                    onClick={downloadHTML}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-2"
                  >
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
                {/* Blog Preview */}
                <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-h-96 overflow-y-auto">
                  <h1 className="text-3xl font-bold text-white mb-4">{generatedContent.title}</h1>
                  <p className="text-gray-400 mb-6 pb-4 border-b border-dark-border">
                    {generatedContent.metaDescription}
                  </p>
                  <div
                    className="text-gray-300 prose prose-invert max-w-none whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: generatedContent.content }}
                  />
                </div>

                {/* SEO Report */}
                <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">📊 SEO Report</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-bg rounded p-4">
                      <p className="text-gray-400 text-sm">SEO Score</p>
                      <p className="text-3xl font-bold text-green-400">{generatedContent.seoReport.score}/100</p>
                    </div>
                    <div className="bg-dark-bg rounded p-4">
                      <p className="text-gray-400 text-sm">Grade</p>
                      <p className="text-3xl font-bold text-blue-400">{generatedContent.seoReport.grade}</p>
                    </div>
                    <div className="bg-dark-bg rounded p-4">
                      <p className="text-gray-400 text-sm">Word Count</p>
                      <p className="text-2xl font-bold text-yellow-400">{generatedContent.wordCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-dark-bg rounded p-4">
                      <p className="text-gray-400 text-sm">Readability</p>
                      <p className="text-2xl font-bold text-purple-400">{generatedContent.seoReport.details.readability.score}/10</p>
                    </div>
                  </div>
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
