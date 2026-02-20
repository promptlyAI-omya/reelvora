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
            // Get params from URL
            const params = new URLSearchParams(window.location.search);
            const slug = params.get('slug');
            const tmdbId = params.get('tmdb_id');

            if (tmdbId) {
                // Fetch dynamically from TMDB via our backend wrapper
                await fetchTMDBMovie(tmdbId);
                return;
            }

            if (!slug) {
                window.location.href = '/';
                return;
            }

            // Fallback to local movies.json
            const response = await fetch('/data/movies.json');
            if (!response.ok) throw new Error('Failed to fetch movies');
            allMovies = await response.json();

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
            hideLoadingScreen();
        }
    }

    async function fetchTMDBMovie(tmdbId) {
        try {
            const res = await fetch(`/api/movie?id=${tmdbId}`);
            if (!res.ok) throw new Error('Failed to fetch TMDB movie details');

            const m = await res.json();

            // Map TMDB response to our internal currentMovie format
            currentMovie = {
                title: m.title,
                year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
                rating: m.vote_average ? m.vote_average.toFixed(1) : 'NR',
                duration: m.runtime ? `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m` : 'N/A',
                genre: m.genres && m.genres.length > 0 ? m.genres.map(g => g.name).join(', ') : 'TMDB Movie',
                language: m.original_language ? m.original_language.toUpperCase() : 'EN',
                description: m.overview || 'No description available for this title.',
                poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '/assets/images/placeholder-poster.webp',
                trailer: null, // Basic extraction won't have the fully parsed trailer without standardizing the backend response
                platforms: [], // Can't easily get platforms without standardizing the backend response
                slug: `tmdb-${tmdbId}`,
                tags: []
            };

            // If backend provides videos, grab the first YouTube one
            if (m.videos && m.videos.results) {
                const ytVideo = m.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
                    m.videos.results.find(v => v.site === 'YouTube');
                if (ytVideo) {
                    currentMovie.trailer = `https://www.youtube.com/embed/${ytVideo.key}`;
                }
            }

            // If backend provides watch providers (US locale by default)
            if (m['watch/providers'] && m['watch/providers'].results && m['watch/providers'].results.IN) {
                const providers = m['watch/providers'].results.IN;
                const flatres = [...(providers.flatrate || []), ...(providers.rent || []), ...(providers.buy || [])];

                // Deduplicate platform names
                const uniqueNames = [...new Set(flatres.map(p => p.provider_name))];

                currentMovie.platforms = uniqueNames;
                currentMovie.providers = uniqueNames.map(name => ({
                    name: name,
                    type: 'Watch',
                    link: providers.link || '#'
                }));
            }

            renderMovieDetail();

            // We skip related movies for TMDB dynamic pages because we don't have the full local DB loaded
            const relatedSection = $('#relatedGrid')?.closest('section');
            if (relatedSection) relatedSection.style.display = 'none';

            setupPosterTilt();
            injectSchemaMarkup();
            updateSEOMeta();
            lazyLoadTrailer();
            hideLoadingScreen();

        } catch (error) {
            console.error('Error in dynamic TMDB movie load:', error);
            $('#movieTitle').textContent = 'Movie not found';
            hideLoadingScreen();
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
        if ($('#movieLanguage')) $('#movieLanguage').textContent = m.language || 'EN';
        $('#movieDuration').textContent = m.duration;
        $('#movieImdb').textContent = m.rating + ' / 10';

        // Badges
        const heroLanguageBadge = $('#heroLanguageBadge');
        if (heroLanguageBadge && m.language) {
            heroLanguageBadge.textContent = m.language;
            heroLanguageBadge.style.display = 'block';
        }
        const heroGenreBadge = $('#heroGenreBadge');
        if (heroGenreBadge && m.tags && m.tags.includes('Action')) {
            heroGenreBadge.textContent = 'ACTION';
            heroGenreBadge.style.display = 'block';
        }

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
        const providers = currentMovie.providers || [];

        // Map legacy string array to object structure if providers is empty but platforms has data (backward compatibility)
        let displayList = providers;
        if (displayList.length === 0 && platforms && platforms.length > 0) {
            displayList = platforms.map(p => ({
                name: p,
                type: 'Watch',
                link: '#' // No link for legacy
            }));
        }

        const platformIcons = {
            'Netflix': '🔴',
            'Amazon Prime': '📦',
            'Amazon Prime Video': '📦',
            'Prime Video': '📦',
            'Disney+': '🏰',
            'Disney+ Hotstar': '🏰',
            'Hotstar': '🏰',
            'Apple TV': '🍎',
            'Apple TV+': '🍎',
            'Hulu': '💚',
            'HBO Max': '💜',
            'YouTube': '▶️',
            'Google Play Movies': '▶️',
            'JioCinema': '📽️',
            'Zee5': '🦓',
            'SonyLIV': '📺'
        };

        if (displayList.length === 0) {
            grid.innerHTML = `
        <div class="platforms-empty" style="text-align: center; width: 100%;">
            <p style="font-size: 1.1rem; color: #aaa; margin-bottom: 0.5rem;">Streaming availability not available.</p>
            <p class="platform-note" style="font-size: 0.8rem; opacity: 0.7;">Streaming availability may vary by region.</p>
        </div>
      `;
            return;
        }

        const buttonsHtml = displayList.map(p => {
            const icon = platformIcons[p.name] || '📺';
            const action = p.type || 'Watch';
            const label = `${action} on ${p.name}`;
            const url = p.link || '#';

            return `
            <a href="${url}" class="affiliate-btn" target="_blank" rel="nofollow sponsored" aria-label="${label}">
                <span>${icon}</span> ${label}
            </a>
            `;
        }).join('');

        // Always add a generic fallback/check more options button
        const fallbackHtml = `
      <a href="https://www.justwatch.com/in/search?q=${encodeURIComponent(currentMovie.title)}" class="affiliate-btn btn-check-availability" rel="nofollow sponsored" target="_blank">
        <span>🔎</span> More Options
      </a>
    `;

        grid.innerHTML = buttonsHtml + fallbackHtml + '<p class="platform-note" style="width:100%; text-align:center; margin-top:0.5rem; font-size:0.8rem; opacity:0.7;">Streaming availability may vary by region.</p>';
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
            .slice(0, 3);

        // If less than 3 in same genre, add from other genres
        if (related.length < 3) {
            const extras = allMovies
                .filter(m => m.slug !== currentMovie.slug && !related.includes(m))
                .slice(0, 3 - related.length);
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
        document.title = `${m.title} (${m.year}) | Watch on OTT | Reelvora`;

        const desc = `${m.description.substring(0, 100)}... Watch ${m.title} on OTT platforms. IMDb Rating: ${m.rating}/10.`;
        setMeta('description', desc);
        setMeta('og:title', `${m.title} (${m.year}) | Watch on OTT | Reelvora`);
        setMeta('og:description', desc);
        setMeta('og:image', m.poster);
        setMeta('og:url', window.location.href);
        setMeta('twitter:title', `${m.title} (${m.year}) | Watch on OTT | Reelvora`);
        setMeta('twitter:description', desc);
        setMeta('twitter:card', 'summary_large_image');

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
