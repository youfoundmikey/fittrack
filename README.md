# FitTrack — Personal Gym Tracker

A PWA (Progressive Web App) gym tracker. Deploy to Vercel and save to your phone's home screen.

## Deploy to Vercel

### Option A: Vercel CLI (fastest)
```bash
npm i -g vercel
vercel
```
Follow the prompts. It auto-detects Next.js.

### Option B: Vercel Dashboard
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Click Deploy (zero config needed)

## Save to phone as an app

**iPhone (Safari):**
1. Open your Vercel URL in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap Add — it installs like a native app

**Android (Chrome):**
1. Open your Vercel URL in Chrome
2. Tap the ⋮ menu → "Add to Home Screen"
3. Tap Install

## Features
- 4 screens: Dashboard, Plans, Exercise Library, Workout Log
- Create workout plans with custom exercises, sets, reps, weight
- Live workout timer + set completion tracking
- Auto-calculates personal records (PRs)
- Volume tracking per session
- All data stored locally in your browser (no account needed)
- Works offline after first load
