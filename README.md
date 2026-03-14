# 🌌 Vangapalagalam — Social Media Platform

> A next-generation, futuristic social networking app with dark glassmorphism UI, real-time chat, stories, reels, and more.

---

## ✨ Features

- 🔐 **Auth** — Email/password signup & login (Supabase Auth)
- 🏠 **Home Feed** — Posts from followed users, infinite scroll, likes & comments
- 🤝 **Follow System** — High-performance following with instant UI updates
- 📖 **Stories** — 24-hour stories with animated progress viewer
- 🎬 **Reels** — Vertical short-video feed with IG-style sharing
- 💬 **Messaging** — Real-time chat with rich shared-content previews
- 🔍 **Explore** — Discover posts, users, trending hashtags with regex parsing
- 🔔 **Notifications** — Likes, comments, follows
- 👤 **Profile** — Grid view, follower/following counts, edit profile (optimized)
- ✏️ **Post Creator** — Upload photos, videos, text posts, stories with auto-tags

---

## 🛠 Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | React 18 + Vite                    |
| Styling    | TailwindCSS (custom dark theme)    |
| Animation  | Framer Motion                      |
| Routing    | React Router v6                    |
| State      | Zustand                            |
| Backend    | Supabase (Auth + DB + Storage + Realtime) |
| Fonts      | Orbitron, Syne, JetBrains Mono     |

---

## 🚀 Quick Start

### Step 1 — Clone / unzip the project

```bash
cd vangapalagalam
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a **free account**
2. Click **"New Project"** → fill in name, database password, region → Create
3. Wait ~2 minutes for it to provision

### Step 4 — Run the SQL setup

1. In your Supabase dashboard, go to **SQL Editor → New Query**
2. Open `supabase_setup.sql` from this project
3. Paste the entire contents and click **Run**
4. This creates all tables, RLS policies, storage buckets, and enables Realtime

### Step 5 — Get your API keys

In Supabase dashboard → **Settings → API**:
- Copy **Project URL** (looks like `https://xxxx.supabase.co`)
- Copy **anon public** key

### Step 6 — Create your .env file

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 7 — Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 🎉

---

## 🌐 Deployment

### Deploy to Vercel (Recommended — Free)

1. Push your project to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**
5. Done! Your app is live at `your-app.vercel.app`

The included `vercel.json` handles SPA routing automatically.

### Deploy to Netlify (Alternative — Free)

1. Push your project to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site** → Import from Git
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Add environment variables in **Site Settings → Environment Variables**
5. Deploy

Create a `_redirects` file in `/public` for Netlify SPA routing:
```
/*  /index.html  200
```

---

## 📁 Project Structure

```
vangapalagalam/
├── public/
├── src/
│   ├── components/
│   │   ├── feed/
│   │   │   └── PostCard.jsx        # Post component (likes, comments, media)
│   │   ├── layout/
│   │   │   └── Layout.jsx          # App shell + bottom nav dock
│   │   ├── stories/
│   │   │   └── Stories.jsx         # Stories row component
│   │   └── ui/
│   │       └── LoadingScreen.jsx   # Animated loading screen
│   ├── context/
│   │   └── authStore.js            # Zustand auth store
│   ├── pages/
│   │   ├── Landing.jsx             # Landing / marketing page
│   │   ├── Auth.jsx                # Login & Signup
│   │   ├── Home.jsx                # Feed with stories + posts
│   │   ├── Explore.jsx             # Search + discover
│   │   ├── Reels.jsx               # Vertical video feed
│   │   ├── Messages.jsx            # Real-time chat
│   │   ├── Notifications.jsx       # Activity feed
│   │   ├── Profile.jsx             # User profile + grid
│   │   ├── StoryViewer.jsx         # Full-screen story viewer
│   │   └── PostCreator.jsx         # Create post / story / reel
│   ├── services/
│   │   └── supabaseClient.js       # Supabase client + helpers
│   ├── App.jsx                     # Router + layout
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Global styles + design system
├── supabase_setup.sql              # Complete DB setup (run once)
├── .env.example                    # Environment variable template
├── vercel.json                     # Vercel SPA routing
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🗄 Database Schema

```
users        — id, username, email, avatar, bio, created_at
posts        — id, user_id, caption, media_url, type, created_at
stories      — id, user_id, media_url, expires_at, created_at
likes        — id, user_id, post_id, created_at
comments     — id, post_id, user_id, text, created_at
followers    — id, follower_id, following_id, created_at
messages     — id, sender_id, receiver_id, message, media_url, seen, created_at
```

---

## 🎨 Design System

The UI uses a custom **dark glassmorphism** theme:

| Token        | Value                  | Usage                        |
|--------------|------------------------|------------------------------|
| `--void`     | `#040408`              | Page background              |
| `--surface`  | `#0a0a12`              | Card backgrounds             |
| `--panel`    | `#0f0f1a`              | Nested panels                |
| `--neon-cyan`| `#00f5ff`              | Primary accent, glows        |
| `--neon-purple`| `#bf00ff`            | Secondary accent             |
| `--neon-pink`| `#ff006e`              | Likes, notifications         |
| `--neon-green`| `#00ff88`             | Success, online states       |

Fonts:
- **Orbitron** — Display / headings / brand
- **Syne** — Body text
- **JetBrains Mono** — Timestamps, labels, code

---

## 🔧 Extending the App

### Add push notifications
Use Supabase Edge Functions + Web Push API.

### Add video compression
Integrate `ffmpeg.wasm` before upload.

### Add DM media sharing
Extend the `messages` table with `media_url` (already in schema).

### Add hashtag pages
Create a `/hashtag/:tag` route that filters posts by caption.

---

## 📄 License

MIT — free to use and modify.

---

Built with 💜 for the Vangapalagalam community.
