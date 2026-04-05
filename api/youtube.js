// youtube-transcript doesn't work reliably in Vercel's serverless environment.
// This uses the YouTube oEmbed + transcript approach via direct HTTP fetch instead.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL.' });

  // Extract video ID from any YouTube URL format
  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL. Please paste a full youtube.com or youtu.be link.' });

  try {
    // Fetch the YouTube page to get the caption track URL
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!pageRes.ok) throw new Error('Could not load YouTube page.');
    const html = await pageRes.text();

    // Pull caption track URL out of the page's inline JSON
    const captionMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl":\s*"([^"]+)"/);
    if (!captionMatch) {
      return res.status(422).json({
        error: 'No captions found. The video may have captions disabled, be private, or age-restricted.',
      });
    }

    const captionUrl = captionMatch[1].replace(/\\u0026/g, '&');

    // Fetch the actual caption XML
    const captionRes = await fetch(captionUrl);
    if (!captionRes.ok) throw new Error('Could not download captions.');
    const xml = await captionRes.text();

    // Parse <text> tags out of the XML
    const lines = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
      .map(m => m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, '')
        .trim()
      )
      .filter(Boolean);

    if (!lines.length) {
      return res.status(422).json({ error: 'Captions were found but could not be parsed.' });
    }

    const transcript = lines.join(' ');
    res.json({ transcript });

  } catch (err) {
    console.error('YouTube error:', err.message);
    res.status(500).json({ error: 'YouTube error: ' + err.message });
  }
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  return null;
}
