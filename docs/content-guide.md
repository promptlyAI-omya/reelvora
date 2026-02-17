# Reelvora Content Guide

This guide explains how to manage content on the Reelvora website. The structure is designed to be simple and easy to update without needing deep coding knowledge.

## 📂 Folder Structure Overview

- **`/data/`**: JSON files containing all main content.
  - `movies.json`: Database of all movies.
  - `articles.json`: Database of all articles and guides.
- **`/assets/images/`**: Images for posters, article covers, etc.
- **`/movies/movie.html`**: Template for all movie detail pages.
- **`/articles/article.html`**: Template for all article pages.
- **`/category/genre.html`**: Template for all genre pages.
- **`/docs/`**: Documentation files (like this one).

---

## 🎬 How to Add a New Movie

1.  **Prepare Images**:
    - Save the movie poster (vertical, approx 2:3 ratio) in `/assets/images/posters/`.
    - Naming convention: `movie-slug-poster.webp` (e.g., `inception-poster.webp`).

2.  **Update Database**:
    - Open `/data/movies.json`.
    - Add a new entry at the top of the array:
    ```json
    {
      "title": "Movie Title",
      "slug": "movie-title-slug",
      "year": 2026,
      "genre": "Sci-Fi",
      "rating": "8.5",
      "duration": "2h 15m",
      "description": "Short description for cards...",
      "poster": "/assets/images/posters/your-poster.webp",
      "trailer": "https://www.youtube.com/embed/VIDEO_ID",
      "featured": false,
      "platforms": ["Netflix", "Amazon Prime"]
    }
    ```
    - **`slug`**: Must be unique URL-friendly string (lowercase, dashes only).
    - **`featured`**: Set to `true` to show in the Homepage Hero Carousel.

3.  **Update Sitemap**:
    - Open `/sitemap.xml`.
    - Add a new `<url>` block for the movie:
    ```xml
    <url>
      <loc>https://yourdomain.com/movies/movie.html?slug=movie-title-slug</loc>
      <lastmod>2026-02-18</lastmod>
    </url>
    ```

---

## 📝 How to Add a New Article

1.  **Update Database**:
    - Open `/data/articles.json`.
    - Add a new entry:
    ```json
    {
      "title": "Article Headline",
      "slug": "article-url-slug",
      "excerpt": "Short summary shown on cards...",
      "date": "2026-02-20",
      "category": "Guides",
      "readTime": "5 min read",
      "coverImage": "/assets/images/articles/placeholder.webp",
      "featured": true,
      "sections": [
        { "heading": "Section 1 Title", "content": "Paragraph content..." },
        { "heading": "Section 2 Title", "content": "Paragraph content..." },
        { "heading": "Section 3 Title", "content": "Paragraph content..." }
      ],
      "faq": [
        { "question": "Q1?", "answer": "Answer 1" }
      ]
    }
    ```
    - **`featured`**: Set to `true` to show in the "Featured Guides" section on the Homepage.
    - **Sections**: You can add more than 3, but the template highlights the first 3.

2.  **Update Sitemap**:
    - Open `/sitemap.xml` and add the new article URL similar to movie pages.

---

## 💰 How to Add Affiliate Links

All platform buttons on Movie Detail pages currently use placeholder links (`#`). to make them functional:

1.  **Open File**: `/assets/js/movie-detail.js`.
2.  **Locate Function**: `renderPlatforms(platforms)`.
3.  **Edit Logic**:
    - The code currently generates links like:
      ```javascript
      <a href="#" class="affiliate-btn" data-platform="${p}" ...>
      ```
    - To add real links, you can create a mapping object:
      ```javascript
      const affiliateLinks = {
        'Netflix': 'https://www.netflix.com/title/12345',
        'Amazon Prime': 'https://amzn.to/example'
      };
      ```
    - And update the `href` to use: `href="${affiliateLinks[p] || '#'}"`.

---

## 🔍 How to Update Category SEO Content

Each genre page has a unique intro section for SEO. To edit this text:

1.  **Open File**: `/assets/js/category.js`.
2.  **Locate Function**: `injectCategoryIntro(genre)`.
3.  **Edit Dictionary**:
    - Find the `intros` object.
    - Edit the HTML string for the specific genre (Action, Sci-Fi, etc.).
    - Keep the `<h2>` and `<p>` tags for proper formatting.

---

## 📢 Ad Slots Locations

Do not remove the ad container divs or their classes (`ad-slot`).

1.  **Homepage**:
    - **Top**: Native banner below Hero.
    - **Mid**: In-feed native ad after 6th movie card.
    - **Footer**: Sticky fixed bottom banner (320x50).
2.  **Movie Detail**:
    - **Top**: Native banner below header.
    - **Mid**: In-content ad below description.
    - **Footer**: Sticky fixed bottom banner.
3.  **Articles**:
    - **Top**: Native banner above title.
    - **Mid**: Between Section 1 and Section 2.
    - **Footer**: Sticky fixed bottom banner.
4.  **Global**:
    - **Popunder**: Before `</body>` on all pages.
    - **Social Bar**: In `<head>` on all pages.

---

## 🛠 Layout & Styling

- **Main Styles**: `/assets/css/style.css`
- **Colors**: Defined in `:root` variables at the top of `style.css`.
- **Responsive**: Mobile styles are at the bottom of `style.css` in `@media` queries.
