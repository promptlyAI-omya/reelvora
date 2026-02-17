/**
 * ============================================================
 * Reelvora — Movie Detail Page JavaScript
 * Handles: slug parsing, movie data loading, dynamic SEO meta,
 *          schema.org markup, 3D poster parallax, trailer lazy
 *          loading, platform buttons, and related movies.
 * ============================================================
 */

(function () {
    'use strict';

    let allMovies = [];
    let currentMovie = null;

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setupNavigation();
        setupSearch();
        await loadMovieData();
        hideLoadingScreen();
        setupScrollAnimations();
    }

    // ═══════════════════════════════════════════════
    // DATA LOADING & ROUTING
    // ═══════════════════════════════════════════════

    async function loadMovieData() {
        try {
            const response = await fetch('/data/movies.json');
            if (!response.ok) throw new Error('Failed to fetch movies');
            allMovies = await response.json();

            // Get slug from URL
            const params = new URLSearchParams(window.location.search);
            const slug = params.get('slug');

            if (!slug) {
                window.location.href = '/';
                return;
            }

            currentMovie = allMovies.find(m => m.slug === slug);

            if (!currentMovie) {
                window.location.href = '/';
                return;
            }

            renderMovieDetail();
            renderRelatedMovies();
            setupPosterTilt();
            injectSchemaMarkup();
            updateSEOMeta();
            lazyLoadTrailer();

        } catch (error) {
            console.error('Error loading movie:', error);
            $('#movieTitle').textContent = 'Movie not found';
        }
    }

    // ═══════════════════════════════════════════════
    // RENDER MOVIE DETAIL
    // ═══════════════════════════════════════════════

    function renderMovieDetail() {
        const m = currentMovie;

        // Title & Rating
        $('#movieTitle').textContent = m.title;
        $('#ratingValue').textContent = m.rating;

        // Info Grid
        $('#movieYear').textContent = m.year;
        $('#movieGenre').textContent = m.genre;
        $('#movieDuration').textContent = m.duration;
        $('#movieImdb').textContent = m.rating + ' / 10';

        // Description
        $('#movieDescription').textContent = m.description;

        // Poster
        const posterImg = $('#moviePosterImg');
        posterImg.src = m.poster;
        posterImg.alt = m.title + ' movie poster';

        // Platforms
        renderPlatforms(m.platforms);
    }

    // ═══════════════════════════════════════════════
    // PLATFORM BUTTONS
    // ═══════════════════════════════════════════════

    function renderPlatforms(platforms) {
        const grid = $('#platformsGrid');
        const platformIcons = {
            'Netflix': '🔴',
            'Amazon Prime': '📦',
            'Disney+': '🏰',
            'Apple TV+': '🍎',
            'Hulu': '💚',
            'HBO Max': '💜'
        };

        grid.innerHTML = platforms.map(p => `
      <button class="btn-platform" aria-label="Watch on ${escapeHTML(p)}">
        <span>${platformIcons[p] || '📺'}</span> ${escapeHTML(p)}
      </button>
    `).join('');
    }

    // ═══════════════════════════════════════════════
    // TRAILER (Lazy Load)
    // ═══════════════════════════════════════════════

    function lazyLoadTrailer() {
        const wrapper = $('#trailerWrapper');
        if (!currentMovie.trailer) {
            $('#trailerSection').style.display = 'none';
            return;
        }

        // Use IntersectionObserver to lazy load the iframe
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        wrapper.innerHTML = `
              <iframe
                src="${currentMovie.trailer}"
                title="${escapeHTML(currentMovie.title)} Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                loading="lazy"
              ></iframe>
            `;
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '200px' });

            observer.observe(wrapper);
        } else {
            // Fallback: load immediately
            wrapper.innerHTML = `
        <iframe
          src="${currentMovie.trailer}"
          title="${escapeHTML(currentMovie.title)} Trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;
        }
    }

    // ═══════════════════════════════════════════════
    // 3D POSTER PARALLAX TILT
    // ═══════════════════════════════════════════════

    function setupPosterTilt() {
        const poster3d = $('#moviePoster3d');
        const posterInner = $('#posterInner');
        const shine = $('#posterShine');

        if (!poster3d || !posterInner) return;

        poster3d.addEventListener('mousemove', (e) => {
            const rect = poster3d.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            posterInner.style.transform = `
        rotateY(${x * 25}deg)
        rotateX(${-y * 25}deg)
        scale(1.02)
      `;

            // Move shine based on mouse position
            if (shine) {
                shine.style.transform = `translateX(${x * 100}px)`;
            }
        });

        poster3d.addEventListener('mouseleave', () => {
            posterInner.style.transform = 'rotateY(0) rotateX(0) scale(1)';
            if (shine) shine.style.transform = 'translateX(0)';
        });
    }

    // ═══════════════════════════════════════════════
    // RELATED MOVIES
    // ═══════════════════════════════════════════════

    function renderRelatedMovies() {
        const related = allMovies
            .filter(m => m.genre === currentMovie.genre && m.slug !== currentMovie.slug)
            .slice(0, 4);

        // If less than 4 in same genre, add from other genres
        if (related.length < 4) {
            const extras = allMovies
                .filter(m => m.slug !== currentMovie.slug && !related.includes(m))
                .slice(0, 4 - related.length);
            related.push(...extras);
        }

        const grid = $('#relatedGrid');
        grid.innerHTML = related.map(m => `
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

        // Add tilt effects to related cards
        setupTiltEffects(grid);
    }

    // ═══════════════════════════════════════════════
    // SEO — Dynamic Meta Tags
    // ═══════════════════════════════════════════════

    function updateSEOMeta() {
        const m = currentMovie;
        document.title = `${m.title} (${m.year}) – Watch Trailer & Stream | Reelvora`;

        setMeta('description', m.description.substring(0, 160));
        setMeta('og:title', `${m.title} (${m.year}) – Reelvora`);
        setMeta('og:description', m.description.substring(0, 200));
        setMeta('og:image', m.poster);
        setMeta('og:url', window.location.href);
        setMeta('twitter:title', `${m.title} (${m.year}) – Reelvora`);
        setMeta('twitter:description', m.description.substring(0, 200));

        // Update canonical
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = window.location.href;
    }

    function setMeta(name, content) {
        let meta = document.querySelector(`meta[property="${name}"]`) ||
            document.querySelector(`meta[name="${name}"]`);
        if (meta) meta.content = content;
    }

    // ═══════════════════════════════════════════════
    // SCHEMA.ORG — Movie Structured Data
    // ═══════════════════════════════════════════════

    function injectSchemaMarkup() {
        const m = currentMovie;
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'Movie',
            'name': m.title,
            'datePublished': m.year.toString(),
            'genre': m.genre,
            'duration': m.duration,
            'description': m.description,
            'image': m.poster,
            'aggregateRating': {
                '@type': 'AggregateRating',
                'ratingValue': m.rating,
                'bestRating': '10',
                'ratingCount': '1'
            },
            'trailer': {
                '@type': 'VideoObject',
                'embedUrl': m.trailer,
                'name': m.title + ' Trailer'
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    // ═══════════════════════════════════════════════
    // NAVIGATION (same as homepage)
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
    // SEARCH (same as homepage)
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
    // 3D TILT EFFECT
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
