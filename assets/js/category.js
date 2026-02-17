/**
 * ============================================================
 * Reelvora — Category Page JavaScript
 * Handles: genre filtering via URL params, dynamic page title,
 *          movie grid rendering, search, and navigation.
 * ============================================================
 */

(function () {
    'use strict';

    let allMovies = [];
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setupNavigation();
        setupSearch();
        await loadCategoryData();
        hideLoadingScreen();
        setupScrollAnimations();
    }

    // ═══════════════════════════════════════════════
    // DATA LOADING & FILTERING
    // ═══════════════════════════════════════════════

    async function loadCategoryData() {
        try {
            const response = await fetch('/data/movies.json');
            if (!response.ok) throw new Error('Failed to fetch movies');
            allMovies = await response.json();

            const params = new URLSearchParams(window.location.search);
            const genre = params.get('genre');

            if (!genre) {
                // Show all movies if no genre specified
                $('#categoryTitle').textContent = 'All Movies';
                $('#categoryCount').textContent = `${allMovies.length} movies`;
                document.title = `All Movies – Reelvora`;
                renderMovieGrid(allMovies);
                return;
            }

            // Filter by genre
            const filtered = allMovies.filter(m =>
                m.genre.toLowerCase() === genre.toLowerCase()
            );

            $('#categoryTitle').textContent = `${genre} Movies`;
            $('#categoryCount').textContent = `${filtered.length} movie${filtered.length !== 1 ? 's' : ''} found`;
            document.title = `${genre} Movies – Browse ${genre} Films | Reelvora`;

            // Update meta description
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.content = `Browse the best ${genre} movies on Reelvora. Discover top-rated ${genre.toLowerCase()} films, watch trailers, and find where to stream.`;
            }

            // Highlight active nav link
            $$('.nav-links a').forEach(link => {
                link.classList.remove('active');
                if (link.textContent.trim() === genre) {
                    link.classList.add('active');
                }
            });

            if (filtered.length === 0) {
                $('#movieGrid').innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:3rem;">
            <p style="color:var(--text-muted);font-size:1.1rem;">No ${genre} movies found.</p>
            <a href="/" class="btn btn-primary" style="margin-top:1rem;">Browse All Movies</a>
          </div>
        `;
                return;
            }

            renderMovieGrid(filtered);
            injectCategoryIntro(genre);

        } catch (error) {
            console.error('Error loading category:', error);
            $('#movieGrid').innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Failed to load movies.</p>';
        }
    }

    // ═══════════════════════════════════════════════
    // CATEGORY INTRO (SEO)
    // ═══════════════════════════════════════════════

    function injectCategoryIntro(genre) {
        const introContainer = $('#categoryIntro');
        if (!introContainer) return;

        const intros = {
            'Action': `
                <h2>Top Action Movies to Watch Now</h2>
                <p>Get ready for adrenaline-pumping excitement with our curated collection of the best action movies. From high-speed chases and explosive battles to martial arts masterpieces, Reelvora brings you the ultimate action experience.</p>
                <p>Whether you're a fan of superhero blockbusters or gritty crime thrillers, explore our list to find your next favorite film. Check back regularly for new additions and hidden gems.</p>
            `,
            'Sci-Fi': `
                <h2>Best Sci-Fi Movies & Future Worlds</h2>
                <p>Explore the unknown with our selection of mind-bending science fiction films. Dive into futuristic dystopias, space exploration sagas, and AI-driven narratives that challenge reality.</p>
                <p>From classic space operas to modern cerebral thrillers, our Sci-Fi category covers it all. Discover movies that push the boundaries of imagination and visual storytelling.</p>
            `,
            'Horror': `
                <h2>Scariest Horror Movies for a Thrilling Night</h2>
                <p>Looking for a scare? Browse our collection of spine-chilling horror movies. We feature everything from supernatural hauntings and psychological thrillers to classic slashers.</p>
                <p>Find the perfect film for your next movie night. Whether you prefer jump scares or slow-burn dread, Reelvora has something to keep you on the edge of your seat.</p>
            `,
            'Comedy': `
                <h2>Laugh Out Loud with Top Comedy Films</h2>
                <p>Lighten the mood with our handpicked comedy movies. Enjoy a mix of slapstick, romantic comedies, dark humor, and family-friendly fun guaranteed to make you smile.</p>
                <p>Discover new favorites and revisit classic hits. Perfect for a relaxing evening or a movie marathon with friends.</p>
            `,
            'Drama': `
                <h2>Powerful Drama Movies & Emotional Stories</h2>
                <p>Experience compelling storytelling with our top-rated drama films. These movies explore complex characters, emotional depth, and gripping narratives that leave a lasting impact.</p>
                <p>From award-winning masterpieces to indie darlings, find drama movies that resonate with you. Explore themes of love, loss, ambition, and redemption.</p>
            `,
            'Thriller': `
                <h2>Edge-of-Your-Seat Thriller Movies</h2>
                <p>Suspense, mystery, and high stakes define our thriller category. Watch movies that keep you guessing until the very end, featuring twists, turns, and intense psychological games.</p>
                <p>Perfect for fans of crime dramas, mystery whodunits, and psychological suspense. Find your next gripping watch here.</p>
            `
        };

        const defaultIntro = `
            <h2>Browse Best ${escapeHTML(genre)} Movies</h2>
            <p>Discover the best ${escapeHTML(genre)} movies on Reelvora. We curate top-rated films, hidden gems, and trending titles to help you find exactly what to watch next.</p>
            <p>Explore our fast-growing collection and enjoy seamless browsing, trailers, and streaming options.</p>
        `;

        introContainer.innerHTML = intros[genre] || defaultIntro;
    }

    // ═══════════════════════════════════════════════
    // MOVIE GRID
    // ═══════════════════════════════════════════════

    function renderMovieGrid(movies) {
        const grid = $('#movieGrid');

        grid.innerHTML = movies.map(m => `
      <article class="movie-card animate-on-scroll">
        <a href="/movies/movie.html?slug=${m.slug}" aria-label="View ${escapeHTML(m.title)}">
          <div class="movie-card-poster">
            <img src="${m.poster}" alt="${escapeHTML(m.title)} poster" loading="lazy" width="220" height="330">
            <span class="movie-card-rating">⭐ ${m.rating}</span>
            <span class="movie-card-genre">${escapeHTML(m.genre)}</span>
            <div class="movie-card-play">▶</div>
          </div>
          <div class="movie-card-info">
            <h3 class="movie-card-title">${escapeHTML(m.title)}</h3>
            <div class="movie-card-meta">
              <span>${m.year}</span>
              <span>•</span>
              <span>${m.duration}</span>
            </div>
          </div>
        </a>
      </article>
    `).join('');

        setupTiltEffects(grid);
    }

    // ═══════════════════════════════════════════════
    // 3D TILT
    // ═══════════════════════════════════════════════

    function setupTiltEffects(container) {
        container.querySelectorAll('.movie-card').forEach(card => {
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

    // ═══════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════

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

        searchBtn?.addEventListener('click', () => {
            navSearch.classList.toggle('active');
            if (navSearch.classList.contains('active')) {
                searchInput.focus();
            } else {
                searchInput.value = '';
                searchOverlay.classList.remove('active');
            }
        });

        searchInput?.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length < 2) {
                searchOverlay.classList.remove('active');
                return;
            }

            const results = allMovies.filter(m =>
                m.title.toLowerCase().includes(query) ||
                m.genre.toLowerCase().includes(query)
            );

            searchOverlay.classList.add('active');

            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-no-results">No movies found</div>';
            } else {
                searchResults.innerHTML = results.map(m => `
          <article class="movie-card">
            <a href="/movies/movie.html?slug=${m.slug}">
              <div class="movie-card-poster">
                <img src="${m.poster}" alt="${escapeHTML(m.title)}" loading="lazy" width="220" height="330">
                <span class="movie-card-rating">⭐ ${m.rating}</span>
              </div>
              <div class="movie-card-info">
                <h3 class="movie-card-title">${escapeHTML(m.title)}</h3>
              </div>
            </a>
          </article>
        `).join('');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                navSearch?.classList.remove('active');
                searchOverlay?.classList.remove('active');
            }
        });
    }

    // ═══════════════════════════════════════════════
    // LOADING & ANIMATIONS
    // ═══════════════════════════════════════════════

    function hideLoadingScreen() {
        const loader = $('#loadingScreen');
        if (loader) setTimeout(() => loader.classList.add('hidden'), 400);
    }

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
        }, { threshold: 0.1 });
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
