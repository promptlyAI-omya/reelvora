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
        searchQuery: ''
    };

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setupNavigation();
        setupSearch();
        setupMobileFilters();
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

        if (genreParam) state.genres = genreParam.split(',').filter(Boolean);
        if (langParam) state.languages = langParam.split(',').filter(Boolean);
        if (ottParam) state.platforms = ottParam.split(',').filter(Boolean);
    }

    function updateURL() {
        const params = new URLSearchParams();

        if (state.genres.length > 0) params.set('genre', state.genres.join(','));
        if (state.languages.length > 0) params.set('language', state.languages.join(','));
        if (state.platforms.length > 0) params.set('ott', state.platforms.join(','));

        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ path: newURL }, '', newURL);

        updatePageMeta();
    }

    function applyFilters() {
        let filtered = allMovies;

        // 1. Filter by Genre (OR logic within group)
        if (state.genres.length > 0) {
            filtered = filtered.filter(m => {
                const movieGenres = m.genres || [m.genre];
                return state.genres.some(g => movieGenres.includes(g) || movieGenres.includes(g));
            });
        }

        // 2. Filter by Language
        if (state.languages.length > 0) {
            filtered = filtered.filter(m => state.languages.includes(getReadableLanguage(m.language)));
        }

        // 3. Filter by Platform (OTT)
        if (state.platforms.length > 0) {
            filtered = filtered.filter(m => {
                const available = (m.providers || []).map(p => p.name);
                return state.platforms.some(p => available.includes(p));
            });
        }

        // 4. Search Query (Filter within category page context if used via state, currently unused in UI but logic exists)
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            filtered = filtered.filter(m => m.title.toLowerCase().includes(q));
        }

        renderMovieGrid(filtered);
        renderActiveTags();
        updateHeader(filtered.length);
    }

    // ═══════════════════════════════════════════════
    // UI RENDERING
    // ═══════════════════════════════════════════════

    function renderFilters() {
        // Collect unique data for options
        const genres = new Set();
        const languages = new Set();
        const platforms = new Set();

        allMovies.forEach(m => {
            // Genres
            if (m.genres) m.genres.forEach(g => genres.add(g));
            else if (m.genre) genres.add(m.genre);

            // Languages
            if (m.language) languages.add(getReadableLanguage(m.language));

            // Platforms
            if (m.providers) m.providers.forEach(p => platforms.add(p.name));
            else if (m.platforms) m.platforms.forEach(p => platforms.add(p));
        });

        // 1. Languages
        const langContainer = $('#languageOptions');
        const sortedLangs = Array.from(languages).sort();
        langContainer.innerHTML = sortedLangs.map(lang => createCheckboxHTML('language', lang, state.languages.includes(lang))).join('');

        // 2. Platforms
        const ottContainer = $('#ottOptions');
        const sortedPlatforms = Array.from(platforms).sort();
        ottContainer.innerHTML = sortedPlatforms.map(p => createCheckboxHTML('platform', p, state.platforms.includes(p))).join('');

        // 3. Genres
        const genreContainer = $('#genreOptions');
        const sortedGenres = Array.from(genres).sort();
        genreContainer.innerHTML = sortedGenres.map(g => createCheckboxHTML('genre', g, state.genres.includes(g))).join('');

        // Bind events
        $$('.filter-options input').forEach(cb => {
            cb.addEventListener('change', handleFilterChange);
        });

        $('#resetFilters').addEventListener('click', resetFilters);
    }

    function createCheckboxHTML(type, value, isChecked) {
        return `
            <label class="checkbox-label">
                <input type="checkbox" data-type="${type}" value="${value}" ${isChecked ? 'checked' : ''}>
                ${value}
            </label>
        `;
    }

    function handleFilterChange(e) {
        const type = e.target.dataset.type;
        const value = e.target.value;
        const checked = e.target.checked;

        if (type === 'language') updateStateList(state.languages, value, checked);
        if (type === 'platform') updateStateList(state.platforms, value, checked);
        if (type === 'genre') updateStateList(state.genres, value, checked);

        applyFilters();
        updateURL();
    }

    function updateStateList(list, value, add) {
        if (add) {
            if (!list.includes(value)) list.push(value);
        } else {
            const idx = list.indexOf(value);
            if (idx > -1) list.splice(idx, 1);
        }
    }

    function resetFilters() {
        state.languages = [];
        state.platforms = [];
        state.genres = [];

        $$('.filter-options input').forEach(cb => cb.checked = false);
        applyFilters();
        updateURL();
    }

    function renderActiveTags() {
        const container = $('#activeTags');
        const tags = [
            ...state.genres.map(v => ({ type: 'genre', value: v })),
            ...state.languages.map(v => ({ type: 'language', value: v })),
            ...state.platforms.map(v => ({ type: 'platform', value: v }))
        ];

        container.innerHTML = tags.map(t => `
            <span class="active-tag">
                ${t.value} 
                <button onclick="removeFilter('${t.type}', '${t.value}')">×</button>
            </span>
        `).join('');

        window.removeFilter = (type, value) => {
            const cb = $(`input[data-type="${type}"][value="${value}"]`);
            if (cb) {
                cb.checked = false;
                handleFilterChange({ target: cb });
            }
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
              <span>${getReadableLanguage(m.language)}</span>
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

    function setupMobileFilters() {
        const applyBtn = $('#applyFiltersMobile');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                $('#filterSidebar').classList.remove('active');
                $('.filter-overlay')?.classList.remove('active');
            });
        }
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
                m.genre.toLowerCase().includes(query) ||
                (m.description && m.description.toLowerCase().includes(query))
            );

            searchOverlay.classList.add('active');

            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-no-results">No movies found for "' + escapeHTML(query) + '"</div>';
            } else {
                searchResults.innerHTML = results.map(m => createMovieCardHTML(m)).join('');
                setupTiltEffects(searchResults); // Apply tilt to search results too
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
