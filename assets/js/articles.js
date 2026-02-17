/**
 * ============================================================
 * Reelvora — Articles Listing Page JavaScript
 * Handles: article data loading, card rendering, navigation.
 * ============================================================
 */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setupNavigation();
        await loadArticles();
        hideLoadingScreen();
    }

    // ═══════════════════════════════════════════════
    // DATA LOADING
    // ═══════════════════════════════════════════════

    async function loadArticles() {
        try {
            const response = await fetch('/data/articles.json');
            if (!response.ok) throw new Error('Failed to fetch articles');
            const articles = await response.json();

            $('#articleCount').textContent = `${articles.length} article${articles.length !== 1 ? 's' : ''}`;
            renderArticleCards(articles);
        } catch (error) {
            console.error('Error loading articles:', error);
            $('#articlesGrid').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No articles found.</p>';
        }
    }

    // ═══════════════════════════════════════════════
    // RENDER ARTICLE CARDS
    // ═══════════════════════════════════════════════

    function renderArticleCards(articles) {
        const grid = $('#articlesGrid');
        grid.innerHTML = articles.map(a => `
            <article class="article-card animate-on-scroll">
                <a href="/articles/article.html?slug=${a.slug}" aria-label="Read: ${escapeHTML(a.title)}">
                    <div class="article-card-cover">
                        <div class="article-card-cover-placeholder">📰</div>
                        <span class="article-card-badge">${escapeHTML(a.category)}</span>
                    </div>
                    <div class="article-card-body">
                        <h3 class="article-card-title">${escapeHTML(a.title)}</h3>
                        <p class="article-card-excerpt">${escapeHTML(a.excerpt)}</p>
                        <div class="article-card-meta">
                            <span>${a.date}</span>
                            <span>•</span>
                            <span>${a.readTime}</span>
                        </div>
                        <span class="article-card-cta">Read More →</span>
                    </div>
                </a>
            </article>
        `).join('');

        // Scroll animations
        setupScrollAnimations();
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
    // LOADING & ANIMATIONS
    // ═══════════════════════════════════════════════

    function hideLoadingScreen() {
        const loader = $('#loadingScreen');
        if (loader) setTimeout(() => loader.classList.add('hidden'), 400);
    }

    function setupScrollAnimations() {
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('visible'));
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
        document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
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
