// Vercel config — extend timeout to 30s for YouTube page fetching
export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL.' });

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({
      error: 'Invalid YouTube URL. Paste a full youtube.com/watch?v= or youtu.be/ link.',
    });
  }

  try {
    // Try fetching captions via the timedtext API first — faster and more reliable
    // than scraping the full page HTML
    const langs = ['en', 'en-US', 'en-GB', 'a.en'];
    let transcript = null;

    for (const lang of langs) {
      const timedTextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      try {
        const r = await fetch(timedTextUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) continue;
        const data = await r.json();
        const events = data?.events?.filter(e => e.segs) ?? [];
        if (!events.length) continue;
        transcript = events
          .flatMap(e => e.segs.map(s => s.utf8 ?? ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (transcript.length > 100) break; // got something useful
      } catch {
        continue;
      }
    }

    // Fallback — scrape the full YouTube page for caption track URL
    if (!transcript) {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!pageRes.ok) {
        return res.status(502).json({ error: `YouTube returned status ${pageRes.status}. Try again in a moment.` });
      }

      const html = await pageRes.text();

      // Extract caption base URL from the page's ytInitialPlayerResponse JSON
      const captionMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl":\s*"([^"]+)"/s);
      if (!captionMatch) {
        return res.status(422).json({
          error: 'No captions found. The video may have captions disabled, be private, or age-restricted.',
        });
      }

      const captionUrl = captionMatch[1]
        .replace(/\\u0026/g, '&')
        .replace(/\\"/g, '"');

      const captionRes = await fetch(captionUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (!captionRes.ok) {
        return res.status(502).json({ error: 'Could not download caption file.' });
      }

      const xml = await captionRes.text();
      const lines = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
        .map(m =>
          m[1]
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
        return res.status(422).json({ error: 'Captions found but could not be parsed.' });
      }

      transcript = lines.join(' ');
    }

    res.json({ transcript });

  } catch (err) {
    console.error('YouTube handler error:', err.message);
    // Return a clean JSON error — never let an unhandled throw reach the client
    res.status(500).json({ error: 'YouTube error: ' + err.message });
  }
}

function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be'))    return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  // bare video ID passed directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}
