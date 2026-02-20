/**
 * ============================================================
 * Reelvora — Full Search Results Page
 * Handles fetching, parsing, and rendering the Vercel API query
 * ============================================================
 */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        // Setup the dynamic full page search handler
        const form = $('#fullSearchForm');
        const input = $('#fullSearchInput');
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const q = input.value.trim();
                if (q.length > 1) {
                    window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
                }
            });
        }

        if (query) {
            if (input) input.value = query;
            await fetchSearchResults(query);
        } else {
            $('#fullSearchGrid').innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Enter a search query above to find movies.</p>';
            $('#searchCount').textContent = 'Awaiting input';
            $('#searchTitle').textContent = 'Search Movies';
        }
    }

    async function fetchSearchResults(query) {
        const grid = $('#fullSearchGrid');
        const countLabel = $('#searchCount');
        const titleLabel = $('#searchTitle');

        titleLabel.textContent = `Results for "${escapeHTML(query)}"`;

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();

            const results = data.results || [];

            if (results.length === 0) {
                grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:3rem;">No movies found. Try another keyword.</p>';
                countLabel.textContent = '0 movies found';
                return;
            }

            countLabel.textContent = `${results.length} movie${results.length !== 1 ? 's' : ''} found`;
            grid.innerHTML = results.map(m => createMovieCardHTML(m)).join('');
            setupTiltEffects(grid);
            setupLazyLoading();

        } catch (error) {
            console.error('Full search error:', error);
            grid.innerHTML = '<p style="text-align:center;color:var(--cta-red);grid-column:1/-1;padding:3rem;">An error occurred while fetching movies.</p>';
            countLabel.textContent = 'Error';
        }
    }

    // ═══════════════════════════════════════════════
    // RENDER HELPERS
    // ═══════════════════════════════════════════════

    function createMovieCardHTML(tmdbMovie) {
        const posterUrl = tmdbMovie.poster_path
            ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
            : '/assets/images/placeholder-poster.webp';

        const year = tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : 'N/A';
        const rating = tmdbMovie.vote_average ? tmdbMovie.vote_average.toFixed(1) : 'NR';

        return `
          <article class="movie-card animate-on-scroll">
            <a href="/movies/movie.html?tmdb_id=${tmdbMovie.id}" aria-label="View ${escapeHTML(tmdbMovie.title)}">
              <div class="movie-card-poster">
                <img src="${posterUrl}" alt="${escapeHTML(tmdbMovie.title)} poster" loading="lazy" width="220" height="330">
                <span class="movie-card-rating">⭐ ${rating}</span>
                <span class="movie-card-genre">TMDB</span>
                <div class="movie-card-play">▶</div>
              </div>
              <div class="movie-card-info">
                <h3 class="movie-card-title">${escapeHTML(tmdbMovie.title)}</h3>
                <div class="movie-card-meta">
                  <span>${year}</span>
                  <span>•</span>
                  <span>Score: ${rating}</span>
                </div>
              </div>
            </a>
          </article>
        `;
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

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
