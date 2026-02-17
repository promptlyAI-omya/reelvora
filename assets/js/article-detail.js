/**
 * ============================================================
 * Reelvora — Article Detail Page JavaScript
 * Handles: slug parsing, article data loading, section rendering,
 *          FAQ rendering, dynamic SEO meta, and navigation.
 * ============================================================
 */

(function () {
    'use strict';

    let currentArticle = null;

    const $ = (sel) => document.querySelector(sel);

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setupNavigation();
        await loadArticleData();
        hideLoadingScreen();
    }

    // ═══════════════════════════════════════════════
    // DATA LOADING & ROUTING
    // ═══════════════════════════════════════════════

    async function loadArticleData() {
        try {
            const response = await fetch('/data/articles.json');
            if (!response.ok) throw new Error('Failed to fetch articles');
            const articles = await response.json();

            const params = new URLSearchParams(window.location.search);
            const slug = params.get('slug');

            if (!slug) {
                window.location.href = '/articles/';
                return;
            }

            currentArticle = articles.find(a => a.slug === slug);

            if (!currentArticle) {
                window.location.href = '/articles/';
                return;
            }

            renderArticle();
            updateSEOMeta();
            injectSchemaMarkup();

        } catch (error) {
            console.error('Error loading article:', error);
            $('#articleTitle').textContent = 'Article not found';
        }
    }

    // ═══════════════════════════════════════════════
    // RENDER ARTICLE
    // ═══════════════════════════════════════════════

    function renderArticle() {
        const a = currentArticle;

        // Breadcrumb
        $('#breadcrumbTitle').textContent = a.title;

        // Header
        $('#articleCategory').textContent = a.category;
        $('#articleTitle').textContent = a.title;
        $('#articleDate').textContent = formatDate(a.date);
        $('#articleReadTime').textContent = a.readTime;

        // Intro (using excerpt as intro)
        $('#articleIntro').innerHTML = `<p>${escapeHTML(a.excerpt)}</p>`;

        // Sections
        if (a.sections && a.sections.length >= 3) {
            for (let i = 0; i < 3; i++) {
                $(`#section${i + 1}Title`).textContent = a.sections[i].heading;
                $(`#section${i + 1}Content`).textContent = a.sections[i].content;
            }
        }

        // FAQ
        renderFAQ(a.faq);
    }

    function renderFAQ(faq) {
        if (!faq || faq.length === 0) {
            $('#articleFAQ').style.display = 'none';
            return;
        }

        const faqList = $('#faqList');
        faqList.innerHTML = faq.map(item => `
            <div class="faq-item">
                <h3 class="faq-question">${escapeHTML(item.question)}</h3>
                <p class="faq-answer">${escapeHTML(item.answer)}</p>
            </div>
        `).join('');
    }

    // ═══════════════════════════════════════════════
    // SEO — Dynamic Meta Tags
    // ═══════════════════════════════════════════════

    function updateSEOMeta() {
        const a = currentArticle;
        document.title = `${a.title} – Reelvora`;

        setMeta('description', a.excerpt.substring(0, 160));
        setMeta('og:title', `${a.title} – Reelvora`);
        setMeta('og:description', a.excerpt.substring(0, 200));
        setMeta('og:url', window.location.href);
        setMeta('twitter:title', `${a.title} – Reelvora`);
        setMeta('twitter:description', a.excerpt.substring(0, 200));

        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = window.location.href;
    }

    function setMeta(name, content) {
        let meta = document.querySelector(`meta[property="${name}"]`) ||
            document.querySelector(`meta[name="${name}"]`);
        if (meta) meta.content = content;
    }

    // ═══════════════════════════════════════════════
    // SCHEMA.ORG — Article Structured Data
    // ═══════════════════════════════════════════════

    function injectSchemaMarkup() {
        const a = currentArticle;
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            'headline': a.title,
            'description': a.excerpt,
            'datePublished': a.date,
            'author': {
                '@type': 'Organization',
                'name': 'Reelvora'
            },
            'publisher': {
                '@type': 'Organization',
                'name': 'Reelvora'
            },
            'mainEntityOfPage': {
                '@type': 'WebPage',
                '@id': window.location.href
            }
        };

        // FAQ schema
        if (a.faq && a.faq.length > 0) {
            const faqSchema = {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                'mainEntity': a.faq.map(item => ({
                    '@type': 'Question',
                    'name': item.question,
                    'acceptedAnswer': {
                        '@type': 'Answer',
                        'text': item.answer
                    }
                }))
            };

            const faqScript = document.createElement('script');
            faqScript.type = 'application/ld+json';
            faqScript.textContent = JSON.stringify(faqSchema);
            document.head.appendChild(faqScript);
        }

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
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
    // LOADING
    // ═══════════════════════════════════════════════

    function hideLoadingScreen() {
        const loader = $('#loadingScreen');
        if (loader) setTimeout(() => loader.classList.add('hidden'), 400);
    }

    // ═══════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

})();
