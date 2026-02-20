/**
 * ============================================================
 * Reelvora — Homepage JavaScript
 * Handles: data loading, hero carousel, movie grid, genre cards,
 *          search, filtering, 3D tilt effects, lazy loading,
 *          scroll animations, and mobile navigation.
 * ============================================================
 */

(function () {
  'use strict';

  // ── State ──
  let allMovies = [];
  let filteredMovies = [];
  let currentHeroIndex = 0;
  let heroInterval = null;
  const HERO_INTERVAL_MS = 5000;

  // ── Genre Icons Map ──
  const genreIcons = {
    'Horror': '👻',
    'Sci-Fi': '🚀',
    'Action': '💥',
    'Thriller': '🔪',
    'Drama': '🎭',
    'Comedy': '😂'
  };

  // ── DOM Elements ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Init ──
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setupNavigation();
    setupSearch();
    await Promise.all([loadMovies(), loadFeaturedGuides()]);
    hideLoadingScreen();
    setupScrollAnimations();
  }

  // ═══════════════════════════════════════════════
  // FEATURED GUIDES
  // ═══════════════════════════════════════════════

  async function loadFeaturedGuides() {
    try {
      const response = await fetch('/data/articles.json');
      if (!response.ok) return; // Silent fail for guides
      const articles = await response.json();
      const featured = articles.filter(a => a.featured).slice(0, 3);

      const grid = $('#guidesGrid');
      if (grid && featured.length > 0) {
        grid.innerHTML = featured.map(a => `
          <article class="article-card animate-on-scroll">
            <a href="/articles/article.html?slug=${a.slug}" aria-label="Read: ${escapeHTML(a.title)}">
              <div class="article-card-cover">
                <div class="article-card-cover-placeholder">📰</div>
                <span class="article-card-badge">${escapeHTML(a.category)}</span>
              </div>
              <div class="article-card-body">
                <h3 class="article-card-title">${escapeHTML(a.title)}</h3>
                <p class="article-card-excerpt">${escapeHTML(a.excerpt)}</p>
                <span class="article-card-cta">Read More →</span>
              </div>
            </a>
          </article>
        `).join('');
      } else {
        $('.featured-guides').style.display = 'none';
      }
    } catch (error) {
      console.warn('Error loading guides:', error);
      $('.featured-guides').style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════

  async function loadMovies() {
    try {
      const response = await fetch('/data/movies.json');
      if (!response.ok) throw new Error('Failed to fetch movies');
      allMovies = await response.json();
      filteredMovies = [...allMovies];

      renderHeroCarousel();
      renderFilterBar();
      renderMovieGrid(allMovies);
      renderGenreGrid();
    } catch (error) {
      console.error('Error loading movies:', error);
      $('#movieGrid').innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Failed to load movies. Please try again later.</p>';
    }
  }

  // ═══════════════════════════════════════════════
  // LOADING SCREEN
  // ═══════════════════════════════════════════════

  function hideLoadingScreen() {
    const loader = $('#loadingScreen');
    if (loader) {
      setTimeout(() => loader.classList.add('hidden'), 400);
    }
  }

  // ═══════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════

  function setupNavigation() {
    const navbar = $('#navbar');
    const navToggle = $('#navToggle');
    const navLinks = $('#navLinks');

    // Sticky nav scroll effect
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // Mobile toggle
    navToggle?.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Close mobile nav on link click
    navLinks?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  // ═══════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════

  function setupSearch() {
    const searchBtn = $('#searchBtn');
    const navSearch = $('#navSearch');
    const searchInput = $('#searchInput');
    const searchOverlay = $('#searchOverlay');
    const searchResults = $('#searchResults');

    // Live Search Auto-Suggest Variables
    let searchTimeout = null;

    // Toggle search bar
    searchBtn?.addEventListener('click', () => {
      navSearch.classList.toggle('active');
      if (navSearch.classList.contains('active')) {
        searchInput.focus();
      } else {
        searchInput.value = '';
        searchOverlay.classList.remove('active');
      }
    });

    // Real-time API search
    searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      if (query.length < 2) {
        searchOverlay.classList.remove('active');
        clearTimeout(searchTimeout);
        return;
      }

      // Debounce API calls (300ms)
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        try {
          searchOverlay.classList.add('active');
          searchResults.innerHTML = '<div class="loader-ring" style="width: 30px; height: 30px; margin: 2rem auto;"></div>';

          // Fetch from our secure Vercel API
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (!response.ok) throw new Error('Search failed');

          const data = await response.json();
          const results = data.results?.slice(0, 5) || [];

          if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">No movies found. Try another keyword.</div>';
          } else {
            searchResults.innerHTML = results.map(m => createSuggestCardHTML(m)).join('');
          }
        } catch (error) {
          console.error('Search error:', error);
          searchResults.innerHTML = '<div class="search-no-results" style="color:var(--cta-red);">Error fetching results.</div>';
        }
      }, 300);
    });

    // Press Enter to go to full results page
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query.length >= 2) {
          window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
        }
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navSearch?.classList.remove('active');
        searchOverlay?.classList.remove('active');
        searchInput.value = '';
      }
    });
  }

  function createSuggestCardHTML(tmdbMovie) {
    const posterUrl = tmdbMovie.poster_path
      ? `https://image.tmdb.org/t/p/w200${tmdbMovie.poster_path}`
      : '/assets/images/placeholder-poster.webp';

    const year = tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : 'N/A';
    const rating = tmdbMovie.vote_average ? tmdbMovie.vote_average.toFixed(1) : 'NR';

    return `
      <a href="/movies/movie.html?tmdb_id=${tmdbMovie.id}" class="suggest-card" aria-label="View ${escapeHTML(tmdbMovie.title)}">
        <img src="${posterUrl}" alt="${escapeHTML(tmdbMovie.title)} poster" class="suggest-poster" loading="lazy">
        <div class="suggest-info">
          <h4 class="suggest-title">${escapeHTML(tmdbMovie.title)}</h4>
          <div class="suggest-meta">
            <span class="suggest-year">${year}</span>
            <span class="suggest-rating">⭐ ${rating}</span>
          </div>
        </div>
      </a>
    `;
  }

  // ═══════════════════════════════════════════════
  // HERO CAROUSEL
  // ═══════════════════════════════════════════════

  function renderHeroCarousel() {
    const featured = allMovies.filter(m => m.featured);
    if (featured.length === 0) return;

    // Render dots
    const dotsContainer = $('#heroDots');
    dotsContainer.innerHTML = featured.map((_, i) =>
      `<div class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`
    ).join('');

    // Dot click handlers
    dotsContainer.querySelectorAll('.hero-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        currentHeroIndex = parseInt(dot.dataset.index);
        updateHero(featured);
        resetHeroInterval(featured);
      });
    });

    // Initial render
    updateHero(featured);

    // Auto-rotate
    heroInterval = setInterval(() => {
      currentHeroIndex = (currentHeroIndex + 1) % featured.length;
      updateHero(featured);
    }, HERO_INTERVAL_MS);

    // 3D tilt on hero card
    const heroCard = $('#heroCard');
    heroCard?.addEventListener('mousemove', (e) => {
      const rect = heroCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroCard.style.transform = `rotateY(${x * 20}deg) rotateX(${- y * 20}deg)`;
    });

    heroCard?.addEventListener('mouseleave', () => {
      heroCard.style.transform = 'rotateY(0) rotateX(0)';
    });
  }

  function updateHero(featured) {
    const movie = featured[currentHeroIndex];
    if (!movie) return;

    // Background
    $('#heroBgImage').src = movie.poster;
    $('#heroBgImage').alt = movie.title + ' backdrop';

    // Info
    $('#heroTitle').innerHTML = movie.title.split(' ').map((word, i) =>
      i === 0 ? `<span class="gradient-text">${word}</span>` : word
    ).join(' ');

    $('#heroMeta').innerHTML = `
      <span class="hero-meta-item"><span class="rating">⭐ ${movie.rating}</span></span>
      <span class="hero-meta-item">${movie.year}</span>
      <span class="hero-meta-item">${movie.genre}</span>
      <span class="hero-meta-item">${movie.duration}</span>
    `;

    $('#heroDescription').textContent = movie.description.substring(0, 180) + '...';
    $('#heroWatchBtn').href = movie.trailer;
    $('#heroWatchBtn').target = '_blank';
    $('#heroDetailBtn').href = `/movies/movie.html?slug=${movie.slug}`;

    // Card
    $('#heroCardImage').src = movie.poster;
    $('#heroCardImage').alt = movie.title + ' poster';
    $('#heroCardTitle').textContent = movie.title;
    $('#heroCardMeta').textContent = `${movie.year} • ${movie.genre} • ${movie.rating} ⭐`;

    // Update dots
    $$('.hero-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentHeroIndex);
    });
  }

  function resetHeroInterval(featured) {
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
      currentHeroIndex = (currentHeroIndex + 1) % featured.length;
      updateHero(featured);
    }, HERO_INTERVAL_MS);
  }

  // ═══════════════════════════════════════════════
  // FILTER BAR
  // ═══════════════════════════════════════════════

  function renderFilterBar() {
    const genres = [...new Set(allMovies.map(m => m.genre))];
    const filterBar = $('#filterBar');

    filterBar.innerHTML = `
    <button class="filter-btn active" data-genre="all">
      <span class="filter-icon">🍿</span> All Movies
    </button>
    ${genres.map(g => `
        <button class="filter-btn" data-genre="${g}">
          <span class="filter-icon">${genreIcons[g] || '🏷️'}</span> ${g}
        </button>`).join('')
      }
  `;

    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Filter movies
        const genre = btn.dataset.genre;
        filteredMovies = genre === 'all' ? [...allMovies] : allMovies.filter(m => m.genre === genre);
        renderMovieGrid(filteredMovies);
      });
    });
  }

  // ═══════════════════════════════════════════════
  // MOVIE GRID
  // ═══════════════════════════════════════════════

  function renderMovieGrid(movies) {
    const grid = $('#movieGrid');

    if (movies.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">No movies found.</p>';
      return;
    }

    // Insert ad slot after the 6th movie
    let html = '';
    movies.forEach((movie, index) => {
      html += createMovieCardHTML(movie);

      // Ad slot after 6th card
      if (index === 5) {
        html += `
    <div class="promo-banner-wrapper" style="grid-column: 1 / -1;">
      <a href="https://www.promptly.help/" target="_blank" rel="noopener" class="promo-banner">
        <div class="promo-header">
          <span class="promo-brand">promptly.help</span>
          <h2 class="promo-title">Choose Your Engine</h2>
        </div>
        <div class="engine-grid">
          <div class="engine-card engine-meme">
            <span class="engine-icon">🎭</span>
            <span class="engine-name">MemeMeter</span>
            <span class="engine-desc">Aaj tum kya nikloge? Discover your meme identity.</span>
          </div>
          <div class="engine-card engine-reply">
            <span class="engine-icon">💘</span>
            <span class="engine-name">ReplyMeter</span>
            <span class="engine-desc">Will your crush reply? Check now.</span>
          </div>
          <div class="engine-card engine-next">
            <span class="engine-icon">🔮</span>
            <span class="engine-name">Next30</span>
            <span class="engine-desc">What's silently shifting? Find out.</span>
          </div>
        </div>
        <div class="promo-footer">
          promptly/mememeter.help — Identity Engine Platform
        </div>
      </a>
    </div>
    `;
      }
    });

    grid.innerHTML = html;

    // Setup 3D tilt effects on cards
    setupTiltEffects(grid);

    // Setup lazy loading
    setupLazyLoading();

    // Re-initialize scroll animations for newly injected cards
    if (typeof setupScrollAnimations === 'function') {
      setupScrollAnimations();
    }
  }

  function createMovieCardHTML(movie) {
    return `
    <article class="movie-card animate-on-scroll" data-slug="${movie.slug}">
      <a href="/movies/movie.html?slug=${movie.slug}" aria-label="View ${escapeHTML(movie.title)}">
        <div class="movie-card-poster">
          <img src="${movie.poster}" alt="${escapeHTML(movie.title)} poster" loading="lazy" width="220" height="330">
            <span class="movie-card-rating">⭐ ${movie.rating}</span>
            <span class="movie-card-genre">${escapeHTML(movie.genre)}</span>
            <div class="movie-card-play">▶</div>
        </div>
        <div class="movie-card-info">
          <h3 class="movie-card-title">${escapeHTML(movie.title)}</h3>
          <div class="movie-card-meta">
            <span>${movie.year}</span>
            <span>•</span>
            <span>${movie.duration}</span>
          </div>
        </div>
      </a>
    </article>
    `;
  }

  // ═══════════════════════════════════════════════
  // GENRE GRID
  // ═══════════════════════════════════════════════

  function renderGenreGrid() {
    const genres = [...new Set(allMovies.map(m => m.genre))];
    const grid = $('#genreGrid');

    grid.innerHTML = genres.map(genre => {
      const count = allMovies.filter(m => m.genre === genre).length;
      return `
    <a href="/category/genre.html?genre=${genre}" class="genre-card animate-on-scroll">
          <div class="genre-card-icon">${genreIcons[genre] || '🎬'}</div>
          <div class="genre-card-name">${genre}</div>
          <div class="genre-card-count">${count} movie${count !== 1 ? 's' : ''}</div>
        </a>
    `;
    }).join('');
  }

  // ═══════════════════════════════════════════════
  // 3D TILT EFFECT
  // ═══════════════════════════════════════════════

  function setupTiltEffects(container) {
    const cards = container.querySelectorAll('.movie-card');

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        card.style.transform = `
  perspective(800px)
  rotateY(${x * 10}deg)
  rotateX(${- y * 10}deg)
scale(1.05)
  `;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale(1)';
      });
    });
  }

  // ═══════════════════════════════════════════════
  // LAZY LOADING (IntersectionObserver)
  // ═══════════════════════════════════════════════

  function setupLazyLoading() {
    if (!('IntersectionObserver' in window)) return;

    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '100px' });

    lazyImages.forEach(img => observer.observe(img));
  }

  // ═══════════════════════════════════════════════
  // SCROLL ANIMATIONS
  // ═══════════════════════════════════════════════

  function setupScrollAnimations() {
    if (!('IntersectionObserver' in window)) {
      $$('.animate-on-scroll').forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    $$('.animate-on-scroll').forEach(el => observer.observe(el));
  }

  // ═══════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

})();
