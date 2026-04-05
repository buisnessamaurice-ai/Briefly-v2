// Uses YouTube's internal Innertube API directly — no scraping, no external packages.
// Completes in 2-4 seconds, well within Vercel's free 10s limit.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL.' });

  const videoId = extractVideoId(url.trim());
  if (!videoId) {
    return res.status(400).json({
      error: 'Invalid YouTube URL. Paste a youtube.com/watch?v= or youtu.be/ link.',
    });
  }

  try {
    // Step 1 — call Innertube /player to get caption track URLs
    // Impersonate the Android YouTube client — fastest and most reliable
    const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.09.37',
        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '19.09.37',
            androidSdkVersion: 30,
            hl: 'en',
            gl: 'US',
          },
        },
      }),
      signal: AbortSignal.timeout(7000),
    });

    if (!playerRes.ok) {
      return res.status(502).json({ error: `YouTube returned ${playerRes.status}. Try again.` });
    }

    const player = await playerRes.json();

    // Step 2 — find the English caption track
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    if (!tracks.length) {
      return res.status(422).json({
        error: 'No captions found. This video may have captions disabled, be private, or age-restricted.',
      });
    }

    // Prefer English, fall back to first available
    const track =
      tracks.find(t => t.languageCode === 'en') ||
      tracks.find(t => t.languageCode?.startsWith('en')) ||
      tracks[0];

    const captionUrl = track.baseUrl;

    // Step 3 — fetch the caption XML
    const captionRes = await fetch(captionUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!captionRes.ok) {
      return res.status(502).json({ error: 'Could not download caption file.' });
    }

    const xml = await captionRes.text();

    // Step 4 — parse <text> tags
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

    res.json({ transcript: lines.join(' ') });

  } catch (err) {
    console.error('YouTube error:', err.message);
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request to YouTube timed out. Try again in a moment.' });
    }
    res.status(500).json({ error: 'YouTube error: ' + err.message });
  }
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be'))    return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}
