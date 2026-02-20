/**
 * ============================================================
 * Reelvora — Category Page JavaScript (Advanced Filtering)
 * Handles: Multi-criteria filtering (Genre, Language, OTT),
 *          URL persistence, dynamic meta updates, and grid rendering.
 * ============================================================
 */

(function () {
    'use strict';

    let allMovies = [];

    // State to track current filters
    let state = {
        genres: [],
        languages: [],
        platforms: [],
        sort: 'trending',
        searchQuery: ''
    };

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setupNavigation();
        setupSearch();
        setupFilterUI();
        await loadData();
    }

    // ═══════════════════════════════════════════════
    // DATA LOADING & INITIALIZATION
    // ═══════════════════════════════════════════════

    async function loadData() {
        try {
            const response = await fetch('/data/movies.json');
            if (!response.ok) throw new Error('Failed to fetch movies');
            allMovies = await response.json();

            // Initialize state from URL 
            readURLParams();

            // Render Filters based on available data
            renderFilters();

            // Initial Filter & Render
            applyFilters();

            hideLoadingScreen();
            setupScrollAnimations();

        } catch (error) {
            console.error('Error loading data:', error);
            $('#movieGrid').innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Failed to load movies.</p>';
        }
    }

    // ═══════════════════════════════════════════════
    // FILTER LOGIC
    // ═══════════════════════════════════════════════

    function readURLParams() {
        const params = new URLSearchParams(window.location.search);

        const genreParam = params.get('genre');
        const langParam = params.get('language');
        const ottParam = params.get('ott');
        const sortParam = params.get('sort');

        if (genreParam) state.genres = genreParam.split(',').filter(Boolean);
        if (langParam) state.languages = langParam.split(',').filter(Boolean);
        if (ottParam) state.platforms = ottParam.split(',').filter(Boolean);
        if (sortParam) state.sort = sortParam;
    }

    function updateURL() {
        const params = new URLSearchParams();

        if (state.genres.length > 0) params.set('genre', state.genres.join(','));
        if (state.languages.length > 0) params.set('language', state.languages.join(','));
        if (state.platforms.length > 0) params.set('ott', state.platforms.join(','));
        if (state.sort && state.sort !== 'trending') params.set('sort', state.sort);

        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ path: newURL }, '', newURL);

        updatePageMeta();
    }

    function applyFilters() {
        let filtered = [...allMovies];

        // 1. Filter by Genre (OR logic within group)
        if (state.genres.length > 0) {
            filtered = filtered.filter(m => {
                const movieGenres = (m.genres || [m.genre]).map(g => (g || '').toLowerCase());
                return state.genres.some(g => movieGenres.includes(g.toLowerCase()));
            });
        }

        // 2. Filter by Language
        if (state.languages.length > 0) {
            filtered = filtered.filter(m => {
                const readableLang = (getReadableLanguage(m.language) || '').toLowerCase();
                return state.languages.some(lang => lang.toLowerCase() === readableLang);
            });
        }

        // 3. Filter by Platform (OTT)
        if (state.platforms.length > 0) {
            filtered = filtered.filter(m => {
                const available = (m.normalizedProviders || []).map(p => p.toLowerCase());
                return state.platforms.some(p => available.includes(p.toLowerCase()));
            });
        }

        // 4. Sorting Logic
        switch (state.sort) {
            case 'rating_desc':
                filtered.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
                break;
            case 'newest':
                filtered.sort((a, b) => parseInt(b.year) - parseInt(a.year));
                break;
            case 'title_asc':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'trending':
            default:
                // Assume default json order is somewhat related to trending/popularity
                break;
        }

        renderMovieGrid(filtered);
        renderActiveTags();
        updateHeader(filtered.length);
        updateBadges();
    }

    // ═══════════════════════════════════════════════
    // UI RENDERING
    // ═══════════════════════════════════════════════

    function setupFilterUI() {
        // Toggle Filter Panels
        $$('.filter-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // If already active, close it (toggle off)
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    $(`#${btn.dataset.target}`).classList.remove('active');
                    return;
                }

                // Deactivate all
                $$('.filter-toggle-btn').forEach(b => b.classList.remove('active'));
                $$('.filter-panel').forEach(p => p.classList.remove('active'));

                // Activate clicked
                btn.classList.add('active');
                $(`#${btn.dataset.target}`).classList.add('active');
            });
        });

        // Initialize Sort Radio UI from State
        const sortInput = $(`input[name="sort"][value="${state.sort}"]`);
        if (sortInput) {
            sortInput.checked = true;
            $$('.sort-chip').forEach(c => c.classList.remove('active'));
            sortInput.closest('.sort-chip').classList.add('active');
        }

        // Sort Chip Changes
        $$('input[name="sort"]').forEach(input => {
            input.addEventListener('change', (e) => {
                $$('.sort-chip').forEach(c => c.classList.remove('active'));
                e.target.closest('.sort-chip').classList.add('active');
                state.sort = e.target.value;
            });
        });

        $('#applyFiltersBtn')?.addEventListener('click', () => {
            applyFilters();
            updateURL();
            // Close all panels on apply
            $$('.filter-toggle-btn').forEach(b => b.classList.remove('active'));
            $$('.filter-panel').forEach(p => p.classList.remove('active'));
        });

        $('#resetFilters')?.addEventListener('click', resetFilters);
    }

    function normalizeProvider(name) {
        if (!name) return null;
        const lower = name.toLowerCase().trim();

        if (lower.includes('amazon') || lower.includes('prime')) return 'Amazon Prime Video';
        if (lower.includes('hotstar')) return 'Disney+ Hotstar';
        if (lower.includes('apple')) return 'Apple TV';
        if (lower.includes('google')) return 'Google Play';
        if (lower.includes('netflix')) return 'Netflix';
        if (lower.includes('youtube')) return 'YouTube';
        if (lower.includes('zee5') || lower.includes('zee 5')) return 'Zee5';
        if (lower.includes('sonyliv')) return 'SonyLIV';
        if (lower.includes('jio')) return 'JioCinema';

        return name;
    }

    const OTT_LOGOS = {
        'Netflix': 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
        'Amazon Prime Video': 'https://image.tmdb.org/t/p/w92/pvske1MyAoymrs5bguRfVqYiM9a.jpg',
        'Disney+ Hotstar': 'https://image.tmdb.org/t/p/w92/kVqjgpcwvDJOhCupjcLzwwtOp52.jpg',
        'YouTube': 'https://image.tmdb.org/t/p/w92/pTnn5JwWr4p3pG8H6VrpiQo7Vs0.jpg',
        'JioCinema': 'https://image.tmdb.org/t/p/w92/5vFRJQgKKEb1ciVq6xboSSHKdGM.jpg',
        'Apple TV': 'https://image.tmdb.org/t/p/w92/SPnB1qiCkYfirS2it3hZORwGVn.jpg',
        'Zee5': 'https://image.tmdb.org/t/p/w92/gP67NRy1ShUJilrzMsbOmEmdmcv.jpg',
        'SonyLIV': 'https://image.tmdb.org/t/p/w92/hxOinPkaO0H1yKq7W8H49M868O3.jpg',
        'Google Play': 'https://image.tmdb.org/t/p/w92/8z7rC8uIDaTM91X0ZfkRf04ydj2.jpg'
    };

    function renderFilters() {
        const languages = new Set();
        const platformsMap = new Map();

        // Populate platforms & languages and cache normalized providers for fast filtering later
        allMovies.forEach(m => {
            if (m.language) languages.add(getReadableLanguage(m.language));

            if (!m.normalizedProviders) {
                m.normalizedProviders = [];
                if (m.providers) {
                    m.providers.forEach(p => {
                        const norm = normalizeProvider(p.name);
                        if (norm && !m.normalizedProviders.includes(norm)) {
                            m.normalizedProviders.push(norm);
                            if (!platformsMap.has(norm)) platformsMap.set(norm, p.logo);
                        }
                    });
                } else if (m.platforms) {
                    m.platforms.forEach(p => {
                        const norm = normalizeProvider(p);
                        if (norm && !m.normalizedProviders.includes(norm)) {
                            m.normalizedProviders.push(norm);
                            if (!platformsMap.has(norm)) platformsMap.set(norm, null);
                        }
                    });
                }
            } else {
                m.normalizedProviders.forEach(norm => {
                    if (!platformsMap.has(norm)) platformsMap.set(norm, null);
                });
            }
        });

        // 1. Languages (Chips)
        const langContainer = $('#languageGrid');
        const sortedLangs = Array.from(languages).sort();
        if (langContainer) {
            langContainer.innerHTML = sortedLangs.map(lang => {
                const isActive = state.languages.includes(lang);
                return `
                 <label class="filter-chip ${isActive ? 'active' : ''}">
                     <input type="checkbox" data-type="language" value="${lang}" ${isActive ? 'checked' : ''}>
                     ${lang}
                 </label>
               `;
            }).join('');
        }

        // 2. Platforms (OTT Cards)
        const ottContainer = $('#ottGrid');
        const popular = ['Netflix', 'Amazon Prime Video', 'Disney+ Hotstar', 'JioCinema', 'Apple TV', 'Zee5', 'SonyLIV', 'YouTube'];
        const sortedPlatforms = Array.from(platformsMap.keys()).sort((a, b) => {
            const aPop = popular.includes(a) ? popular.indexOf(a) : 999;
            const bPop = popular.includes(b) ? popular.indexOf(b) : 999;
            return aPop - bPop || a.localeCompare(b);
        });

        if (ottContainer) {
            const topPlatforms = sortedPlatforms.slice(0, 8);
            const morePlatforms = sortedPlatforms.slice(8);

            const renderCard = (p) => {
                const isActive = state.platforms.includes(p);
                const logoPath = platformsMap.get(p);
                let logoSrc = OTT_LOGOS[p];
                if (!logoSrc && logoPath) logoSrc = `https://image.tmdb.org/t/p/w92${logoPath}`;

                if (logoSrc) {
                    return `
                     <label class="ott-card ${isActive ? 'active' : ''}" title="${p}">
                         <input type="checkbox" data-type="platform" value="${p}" ${isActive ? 'checked' : ''}>
                         <img src="${logoSrc}" alt="${p}" class="ott-logo" loading="lazy">
                     </label>
                   `;
                } else {
                    return `
                     <label class="filter-chip ${isActive ? 'active' : ''}">
                         <input type="checkbox" data-type="platform" value="${p}" ${isActive ? 'checked' : ''}>
                         ${p}
                     </label>
                   `;
                }
            };

            let html = topPlatforms.map(renderCard).join('');

            if (morePlatforms.length > 0) {
                html += `
                    <div id="moreOttContainer" style="display: none; width: 100%; grid-column: 1 / -1; margin-top: 1rem;">
                        <div class="filter-ott-grid" style="width:100%;">
                            ${morePlatforms.map(renderCard).join('')}
                        </div>
                    </div>
                    <button id="showMoreOttBtn" class="btn-text" style="grid-column: 1 / -1; color: var(--neon-purple); text-align: center; margin-top: 10px; width: 100%;">Show More Platforms</button>
                `;
            }

            ottContainer.innerHTML = html;

            const showMoreBtn = $('#showMoreOttBtn');
            if (showMoreBtn) {
                showMoreBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const moreCont = $('#moreOttContainer');
                    if (moreCont.style.display === 'none') {
                        moreCont.style.display = 'block';
                        showMoreBtn.textContent = 'Show Less Platforms';
                    } else {
                        moreCont.style.display = 'none';
                        showMoreBtn.textContent = 'Show More Platforms';
                    }
                });
            }
        }

        // Bind events
        $$('.filter-chip input, .ott-card input').forEach(cb => {
            cb.addEventListener('change', handleFilterChange);
        });

        updateBadges();
    }

    function handleFilterChange(e) {
        const type = e.target.dataset.type;
        const value = e.target.value;
        const checked = e.target.checked;

        // Visual Update
        const label = e.target.closest('label');
        if (checked) label.classList.add('active');
        else label.classList.remove('active');

        if (type === 'language') updateStateList(state.languages, value, checked);
        if (type === 'platform') updateStateList(state.platforms, value, checked);
        if (type === 'genre') updateStateList(state.genres, value, checked); // Kept in state but hidden from UI

        // Visual update only, wait for Apply button
        updateBadges();
    }

    function updateStateList(list, value, add) {
        if (add) {
            if (!list.includes(value)) list.push(value);
        } else {
            const idx = list.indexOf(value);
            if (idx > -1) list.splice(idx, 1);
        }
    }

    function updateBadges() {
        const langBadge = $('#languageBadge');
        if (langBadge) {
            langBadge.textContent = state.languages.length;
            langBadge.style.display = state.languages.length > 0 ? 'inline-block' : 'none';
        }

        const ottBadge = $('#ottBadge');
        if (ottBadge) {
            ottBadge.textContent = state.platforms.length;
            ottBadge.style.display = state.platforms.length > 0 ? 'inline-block' : 'none';
        }
    }

    function resetFilters() {
        state.languages = [];
        state.platforms = [];

        // Reset Visuals
        $$('.filter-chip, .ott-card').forEach(label => label.classList.remove('active'));
        $$('.filter-chip input, .ott-card input').forEach(cb => cb.checked = false);

        applyFilters();
        updateURL();
    }

    function renderActiveTags() {
        const container = $('#activeTags');
        if (!container) return;

        const tags = [
            ...state.languages.map(v => ({ type: 'language', value: v })),
            ...state.platforms.map(v => ({ type: 'platform', value: v }))
        ];

        if (tags.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = tags.map(t => `
            <span class="active-tag">
                ${t.value} 
                <button onclick="window.removeFilter('${t.type}', '${t.value}')">×</button>
            </span>
        `).join('');

        window.removeFilter = (type, value) => {
            const cb = $(`input[data-type="${type}"][value="${value}"]`);
            if (cb) {
                cb.checked = false;
                handleFilterChange({ target: cb });
            } else {
                // Failsafe if DOM element isn't found
                if (type === 'language') updateStateList(state.languages, value, false);
                if (type === 'platform') updateStateList(state.platforms, value, false);
            }
            applyFilters();
            updateURL();
        };
    }

    function updateHeader(count) {
        const title = state.genres.length > 0 ? `${state.genres.join(' & ')} Movies` : 'All Movies';
        $('#categoryTitle').textContent = title;
        $('#categoryCount').textContent = `${count} movie${count !== 1 ? 's' : ''} found`;
    }

    function updatePageMeta() {
        let titleParts = [];
        if (state.genres.length > 0) titleParts.push(state.genres.join('/'));
        else titleParts.push('Movies');
        if (state.languages.length > 0) titleParts.push(`in ${state.languages.join(', ')}`);
        if (state.platforms.length > 0) titleParts.push(`on ${state.platforms.join(', ')}`);

        const pageTitle = `${titleParts.join(' ')} | Reelvora`;
        document.title = pageTitle;

        const metaDesc = $(`meta[name="description"]`);
        if (metaDesc) {
            metaDesc.content = `Browse ${pageTitle}. Discover top files, watch trailers, and find where to stream on Reelvora.`;
        }
    }

    function getReadableLanguage(code) {
        const map = {
            'HI': 'Hindi', 'EN': 'English', 'TA': 'Tamil', 'TE': 'Telugu',
            'ML': 'Malayalam', 'KN': 'Kannada', 'JA': 'Japanese',
            'KO': 'Korean', 'ES': 'Spanish', 'FR': 'French'
        };
        return map[code] || code || 'Other';
    }

    // ═══════════════════════════════════════════════
    // MOVIE GRID RENDER
    // ═══════════════════════════════════════════════

    function renderMovieGrid(movies) {
        const grid = $('#movieGrid');

        if (movies.length === 0) {
            grid.innerHTML = `
                  <div style="grid-column:1/-1;text-align:center;padding:3rem;">
                    <p style="color:var(--text-muted);font-size:1.1rem;">No movies match your filters.</p>
                    <button class="btn btn-primary" onclick="window.removeFilterAll()" style="margin-top:1rem;">Clear All Filters</button>
                  </div>
            `;
            window.removeFilterAll = resetFilters;
            return;
        }

        grid.innerHTML = movies.map(m => {
            let providersHtml = '';
            if (m.normalizedProviders && m.normalizedProviders.length > 0) {
                const topP = m.normalizedProviders.slice(0, 4);
                providersHtml = `<div class="movie-card-providers" style="display: flex; gap: 8px; margin-top: 10px; align-items: center;">` +
                    topP.map(p => {
                        let l = OTT_LOGOS[p];
                        return l ? `<img src="${l}" alt="${p}" title="${p}" style="height: 22px; width: auto; border-radius: 4px; object-fit: contain;">` : '';
                    }).join('') + `</div>`;
            }

            return `
      <article class="movie-card animate-on-scroll visible">
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
              <span>${getReadableLanguage(m.language)}</span>
            </div>
            ${providersHtml}
          </div>
        </a>
      </article>
      `;
        }).join('');

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
    // MOBILE / NAVIGATION
    // ═══════════════════════════════════════════════

    function setupNavigation() {
        const navbar = $('#navbar');
        const navToggle = $('#navToggle');
        const navLinks = $('#navLinks');

        window.addEventListener('scroll', () => {
            if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });

        navToggle?.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
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

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                navSearch?.classList.remove('active');
                searchOverlay?.classList.remove('active');
                searchInput.value = '';
            }
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

    function createMovieCardHTML(movie) {
        return `
      <article class="movie-card animate-on-scroll">
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
    // UTILS
    // ═══════════════════════════════════════════════

    function hideLoadingScreen() {
        const loader = $('#loadingScreen');
        if (loader) setTimeout(() => loader.classList.add('hidden'), 400);
    }

    function setupScrollAnimations() {
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

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
