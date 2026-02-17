# Reelvora — Movie Discovery Web App

## 🎬 Project Overview
A modern, high-performance, 3D-styled movie listing web app built with pure HTML, CSS, and vanilla JavaScript. Dark cinematic theme with glassmorphism effects, 3D hover animations, and neon purple accents. Fully static — ready to deploy on Netlify or Vercel.

## 🎨 Brand Identity
- **Logo**: Reel (white) + vora (purple glow #8B5CF6)
- **Background**: #0B0B0F (deep cinematic black)
- **Card BG**: #15151D with glassmorphism blur
- **Primary Accent**: #8B5CF6 (purple glow)
- **CTA Buttons**: #E50914 (cinematic red)
- **Text**: #FFFFFF primary / #A1A1AA secondary

## 📁 Folder Structure
```
/index.html              — Homepage (hero, movie grid, genres)
/movies/movie.html       — Movie detail page (query param: ?slug=xxx)
/category/genre.html     — Genre listing page (query param: ?genre=xxx)
/privacy-policy.html     — Privacy policy
/terms.html              — Terms of service
/assets/css/style.css    — Complete design system
/assets/js/app.js        — Homepage logic
/assets/js/movie-detail.js — Detail page logic
/assets/js/category.js   — Category page logic
/data/movies.json        — Movie data (12 movies, 6 genres)
/robots.txt              — Search engine crawler config
/sitemap.xml             — XML sitemap
```

## 🚀 Quick Start
```bash
npm install -g serve
serve . -p 3500
# Open http://localhost:3500
```

## 🚢 Deploy
- **Netlify**: Drag & drop the project folder, or connect GitHub repo
- **Vercel**: `vercel --prod` from the project root

## 🎨 Features
- Dark cinematic theme (#0B0B0F → deep purple gradient)
- Glassmorphism cards with backdrop blur
- 3D tilt effects on hover (CSS perspective + JS mousemove)
- 3D parallax poster on detail page with shine overlay
- Hero carousel with auto-rotation
- Real-time search functionality
- Genre filtering
- Movie detail pages with trailer, platforms, related movies
- 6 strategic ad slot placeholders
- SEO optimized (meta, OG, schema.org)
- Mobile-first responsive design
- CSS-only loading animation + scroll animations

## 💰 Ad Integration
Replace placeholder divs with your ad network scripts:
```html
<div class="ad-slot ad-top"><!-- Top banner: 728x90 --></div>
<div class="ad-slot ad-mid"><!-- Mid-content: 336x280 --></div>
<div class="ad-slot ad-native"><!-- Native/in-feed --></div>
<div class="ad-slot ad-in-article"><!-- In-article: 336x280 --></div>
<div class="ad-slot ad-sticky"><!-- Sticky bottom: 320x50 --></div>
<div class="pop-script-placeholder"><!-- Pop script --></div>
```

## 📊 Adding Movies
Edit `data/movies.json`:
```json
{
  "title": "Movie Name",
  "slug": "movie-name",
  "year": 2026,
  "genre": "Action",
  "rating": "8.5",
  "duration": "2h 10m",
  "poster": "https://your-image-url.webp",
  "trailer": "https://www.youtube.com/embed/VIDEO_ID",
  "description": "SEO optimized movie description...",
  "platforms": ["Netflix", "Amazon Prime"],
  "featured": true
}
```
