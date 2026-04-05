import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL.' });

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    const text = transcript.map(t => t.text).join(' ');
    if (!text) return res.status(422).json({ error: 'No transcript found. The video may have captions disabled.' });
    res.json({ transcript: text });
  } catch (err) {
    console.error('YouTube error:', err.message);
    res.status(500).json({ error: 'Could not fetch transcript: ' + err.message });
  }
}
