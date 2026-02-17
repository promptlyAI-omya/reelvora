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
    await loadMovies();
    hideLoadingScreen();
    setupScrollAnimations();
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

    // Real-time search
    searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();

      if (query.length < 2) {
        searchOverlay.classList.remove('active');
        return;
      }

      const results = allMovies.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.genre.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      );

      searchOverlay.classList.add('active');

      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">No movies found for "' + escapeHTML(query) + '"</div>';
      } else {
        searchResults.innerHTML = results.map(m => createMovieCardHTML(m)).join('');
        setupTiltEffects(searchResults);
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
      heroCard.style.transform = `rotateY(${x * 20}deg) rotateX(${-y * 20}deg)`;
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
      <button class="filter-btn active" data-genre="all">All</button>
      ${genres.map(g => `<button class="filter-btn" data-genre="${g}">${g}</button>`).join('')}
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
          <div class="ad-slot ad-mid" style="grid-column: 1 / -1;">
            <!-- Insert mid-content ad script here -->
            <span class="ad-slot-label">Advertisement</span>
          </div>
        `;
      }
    });

    grid.innerHTML = html;

    // Setup 3D tilt effects on cards
    setupTiltEffects(grid);

    // Setup lazy loading
    setupLazyLoading();
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
          rotateX(${-y * 10}deg)
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
