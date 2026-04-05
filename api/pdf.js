import formidable from 'formidable';
import { readFileSync } from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

// Required for Vercel — disable default body parser so formidable can read the stream
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });

  try {
    const [, files] = await form.parse(req);
    const file = files.pdf?.[0];
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });

    const buffer = readFileSync(file.filepath);
    const data   = await pdfParse(buffer);
    const text   = data.text.trim();

    if (!text) return res.status(422).json({ error: 'Could not extract text. The PDF may be image-based/scanned.' });

    res.json({ text });
  } catch (err) {
    console.error('PDF error:', err.message);
    res.status(500).json({ error: 'PDF parsing failed: ' + err.message });
  }
}
