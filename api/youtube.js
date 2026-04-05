import { fetchTranscript } from 'youtube-transcript-plus';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL.' });

  try {
    const segments = await fetchTranscript(url.trim(), {
      lang: 'en',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    if (!segments || !segments.length) {
      return res.status(422).json({
        error: 'No captions found. The video may have captions disabled, be private, or age-restricted.',
      });
    }

    const transcript = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    res.json({ transcript });

  } catch (err) {
    console.error('YouTube error:', err.message);

    // Give the user a readable message based on the error type
    const msg = err.message?.toLowerCase() ?? '';
    if (msg.includes('disabled'))     return res.status(422).json({ error: 'Captions are disabled for this video.' });
    if (msg.includes('unavailable'))  return res.status(422).json({ error: 'Video is unavailable or private.' });
    if (msg.includes('not available'))return res.status(422).json({ error: 'No transcript available for this video.' });

    res.status(500).json({ error: 'Could not fetch transcript: ' + err.message });
  }
}
