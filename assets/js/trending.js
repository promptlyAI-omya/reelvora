/**
 * ============================================================
 * Reelvora — Trending Page JavaScript
 * Handles: Loading movies.json, filtering by tags (Netflix, India, Other),
 *          and rendering the grids.
 * ============================================================
 */

(function () {
    'use strict';

    // ── State ──
    let allMovies = [];

    // ── DOM Elements ──
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ── Init ──
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setupNavigation();
        setupSearch(); // Reuse search logic
        await loadMovies();
        hideLoadingScreen();
    }

    // ═══════════════════════════════════════════════
    // DATA LOADING
    // ═══════════════════════════════════════════════

    async function loadMovies() {
        try {
            const response = await fetch('/data/movies.json');
            if (!response.ok) throw new Error('Failed to fetch movies');
            allMovies = await response.json();

            renderTrendingSections();
        } catch (error) {
            console.error('Error loading movies:', error);
            // Show error in all grids
            const errorMsg = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Failed to load trending movies.</p>';
            $('#netflixGrid').innerHTML = errorMsg;
            $('#indiaGrid').innerHTML = errorMsg;
            $('#otherGrid').innerHTML = errorMsg;
        }
    }

    function renderTrendingSections() {
        const netflixMovies = allMovies.filter(m => m.tags && m.tags.includes('Netflix'));
        const indiaMovies = allMovies.filter(m => m.tags && m.tags.includes('India'));
        const otherMovies = allMovies.filter(m => m.tags && (m.tags.includes('Trending') && !m.tags.includes('Netflix') && !m.tags.includes('India')));

        // If 'Other' logic is too strict, we can just look for 'Hollywood' or whatever was in the fetch script
        // The fetch script used keys from CATEGORIES: NETFLIX, INDIA, OTHER.
        // OTHER had tags: ['Trending', 'Hollywood', ...]
        // So checking for 'Hollywood' or explicitly filtering out the others works.

        // Actually, let's be more specific based on the script I wrote
        // OTHER movies had tags: 'Trending', 'Hollywood'

        const netflixGrid = $('#netflixGrid');
        const indiaGrid = $('#indiaGrid');
        const otherGrid = $('#otherGrid');

        renderGrid(netflixGrid, netflixMovies);
        renderGrid(indiaGrid, indiaMovies);
        renderGrid(otherGrid, otherMovies);
    }

    function renderGrid(container, movies) {
        if (!propertiesExist(container)) return;

        if (movies.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">No movies found.</p>';
            return;
        }

        container.innerHTML = movies.map(m => createMovieCardHTML(m)).join('');

        // 3D Tilt
        setupTiltEffects(container);
    }

    function propertiesExist(el) {
        return el !== null;
    }

    function createMovieCardHTML(movie) {
        return `
        <article class="movie-card" data-slug="${movie.slug}">
          <a href="/movies/movie.html?slug=${movie.slug}" aria-label="View ${escapeHTML(movie.title)}">
            <div class="movie-card-poster">
              <img src="${movie.poster}" alt="${escapeHTML(movie.title)} poster" loading="lazy" width="220" height="330">
              <span class="movie-card-rating">⭐ ${movie.rating}</span>
              ${movie.language ? `<span class="movie-card-quality" style="top: 10px; right: 10px; left: auto; background: var(--secondary);"> ${movie.language} </span>` : ''}
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
    // LOADING SCREEN & NAV (Simplified reuse)
    // ═══════════════════════════════════════════════
    // Ideally this code should be shared in a common.js, duplicating for now to avoid refactoring risk

    function hideLoadingScreen() {
        const loader = $('#loadingScreen');
        if (loader) setTimeout(() => loader.classList.add('hidden'), 400);
    }

    function setupNavigation() {
        const navbar = $('#navbar');
        const navToggle = $('#navToggle');
        const navLinks = $('#navLinks');

        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });

        navToggle?.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // ═══════════════════════════════════════════════
    // SEARCH Reuse (Quick Implementation)
    // ═══════════════════════════════════════════════
    function setupSearch() {
        // ... (Same search logic as app.js or similar)
        // For brevity, basic search button toggle
        const searchBtn = $('#searchBtn');
        const navSearch = $('#navSearch');
        searchBtn?.addEventListener('click', () => navSearch.classList.toggle('active'));
    }

    function setupTiltEffects(container) {
        const cards = container.querySelectorAll('.movie-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.05)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale(1)';
            });
        });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
