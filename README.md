# Briefly — NLP Summarizer v2

Summarize anything — text, YouTube videos, PDFs, or video files.  
Powered by **Groq AI** (free tier, no credit card required).  
Deployable on **Vercel** (free) in under 2 minutes.

---

## Features

- **📝 Text** — paste any article, transcript, report, or notes
- **▶ YouTube** — paste a URL, transcript is fetched and summarized automatically
- **📄 PDF** — upload a PDF, text is extracted on the backend
- **🎬 Video** — upload a video file
- **🌐 8 languages** — English, French, Spanish, German, Italian, Portuguese, Japanese, Chinese
- **💬 Q&A mode** — ask follow-up questions after any summary
- **↓ Export** — download as `.txt` or `.md`
- **⏱ History** — last 50 summaries saved privately in your browser
- **🌙 Dark mode** — automatic

---

## Project Structure

```
briefly/
├── api/
│   ├── summarize.js      # Groq streaming — summarizes text
│   ├── qa.js             # Groq streaming — Q&A with context
│   ├── youtube.js        # Fetches YouTube transcript
│   └── pdf.js            # Extracts text from uploaded PDF
├── public/
│   ├── index.html        # App markup
│   ├── css/styles.css    # All styles (light + dark mode)
│   └── js/app.js         # Frontend logic
├── vercel.json           # Routing config for Vercel
├── package.json
├── .env.example          # Copy to .env and add your key
├── .gitignore
└── README.md
```

---

## Step 1 — Get a free Groq API key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up — no credit card needed
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

---

## Step 2 — Run locally

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/briefly.git
cd briefly

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# Open .env and paste your key: GROQ_API_KEY=gsk_...

# 4. Start local dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> `npm run dev` uses the Vercel CLI to simulate the serverless environment locally —
> so what works locally will work on Vercel exactly the same way.

---

## Step 3 — Deploy to Vercel (free, live URL)

### Option A — via Vercel website (easiest)

1. Push your repo to GitHub (`.env` is git-ignored — never committed)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
3. In the **Environment Variables** section add:
   - Name: `GROQ_API_KEY`
   - Value: your key from [console.groq.com](https://console.groq.com)
4. Click **Deploy** — done. You get a live `https://your-app.vercel.app` URL.

### Option B — via terminal

```bash
npm install -g vercel   # install Vercel CLI once
vercel login            # sign in
vercel                  # deploy — it will ask for your env variable
```

Every `git push` after that auto-redeploys.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `GROQ_API_KEY` errors | Make sure the key is in `.env` locally, or in Vercel's Environment Variables for production |
| `Cannot find module` | Run `npm install` |
| YouTube: no transcript | Video has captions disabled, is private, or is age-restricted |
| PDF: no text extracted | PDF is image-based/scanned — text extraction won't work on those |
| Vercel functions timing out | Groq is very fast, but very large PDFs can be slow — try a smaller file |

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Vanilla HTML, CSS, JavaScript (in `public/`) |
| Backend  | Vercel Serverless Functions (in `api/`) |
| AI       | [Groq](https://groq.com) — `llama-3.3-70b-versatile` (free) |
| PDF      | pdf-parse |
| YouTube  | youtube-transcript |
| Fonts    | DM Serif Display, Sora, DM Mono (Google Fonts) |

---

## License

MIT
