const fs = require('fs');
const path = require('path');
const axios = require('axios');
const slugify = require('slugify');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const MOVIES_FILE = path.join(__dirname, '../data/movies.json');
const POSTERS_DIR = path.join(__dirname, '../assets/images/posters');

// Categorized Movie Lists
const CATEGORIES = {
    ACTION: [
        { name: "Kill", year: 2023, tags: ['Action', 'India'] },
        { name: "Dhurandhar", year: 2025, tags: ['Action', 'India'] },
        { name: "Controll", year: 2025, tags: ['Action', 'India'] },
        { name: "Ek Tha Tiger", year: 2012, tags: ['Action', 'India'] },
        { name: "Singham", year: 2011, tags: ['Action', 'India'] },
        { name: "Krrish", year: 2006, tags: ['Action', 'India'] },
        { name: "Wanted", year: 2009, tags: ['Action', 'India'] },
        { name: "Rowdy Rathore", year: 2012, tags: ['Action', 'India'] },
        { name: "Dhoom", year: 2004, tags: ['Action', 'India'] },
        { name: "Ghajini", year: 2008, tags: ['Action', 'India'] }
    ],
    NETFLIX: [
        { name: "Joe's College Road Trip", year: 2025, tags: ['Netflix', 'Trending'] }, // Assuming name
        { name: "How to Train Your Dragon", year: 2025, tags: ['Netflix', 'Trending'] }, // Live Action
        { name: "The Investigation of Lucy Letby", year: null, tags: ['Netflix', 'Documentary', 'Trending'] },
        { name: "Dhurandhar", year: 2025, tags: ['Netflix', 'India', 'Trending'] },
        { name: "Anaganaga Oka Raju", year: null, tags: ['Netflix', 'India', 'Trending'] },
        { name: "Twisters", year: 2024, tags: ['Netflix', 'Trending'] }
    ],
    INDIA: [
        { name: "O' Romeo", year: 2025, tags: ['India', 'Trending', 'Theatrical'] },
        { name: "Dhurandhar", year: 2025, tags: ['India', 'Trending', 'Netflix'] }, // Duplicate handling needed? We'll merge tags if exists
        { name: "Border 2", year: 2026, tags: ['India', 'Trending', 'Theatrical'] },
        { name: "Tu Yaa Main", year: null, tags: ['India', 'Trending'] },
        { name: "Param Sundari", year: 2025, tags: ['India', 'Trending'] },
        { name: "Trending", year: 2025, tags: ['India', 'Trending'] } // "Trending (2025 Tamil film)"
    ],
    OTHER: [
        { name: "Sinners", year: 2025, tags: ['Trending', 'Hollywood'] },
        { name: "Nobody 2", year: 2025, tags: ['Trending', 'Hollywood', 'Action'] },
        { name: "Weapons", year: 2026, tags: ['Trending', 'Hollywood', 'Horror'] }
    ],
    EXISTING_HORROR: [ // Keeping previous list to ensure they persist with Horror tag
        { name: 'Tumbbad', year: 2018, tags: ['Horror', 'India'] },
        { name: 'Bulbbul', year: 2020, tags: ['Horror', 'India', 'Netflix'] },
        { name: '13B: Fear Has a New Address', year: 2009, tags: ['Horror', 'India'] },
        { name: 'Stree', year: 2018, tags: ['Horror', 'India', 'Comedy'] },
        { name: 'Haunted – 3D', year: 2011, tags: ['Horror', 'India'] },
        { name: 'The House Next Door', year: 2017, tags: ['Horror', 'India'] },
        { name: 'Bhoot', year: 2003, tags: ['Horror', 'India'] }
    ]
};

// Flatten list for processing
const ALL_TARGETS = [
    ...CATEGORIES.ACTION.map(m => ({ ...m, category: 'Action' })),
    ...CATEGORIES.NETFLIX.map(m => ({ ...m, category: 'Netflix' })),
    ...CATEGORIES.INDIA.map(m => ({ ...m, category: 'India' })),
    ...CATEGORIES.OTHER.map(m => ({ ...m, category: 'Other' })),
    ...CATEGORIES.EXISTING_HORROR.map(m => ({ ...m, category: 'Horror' }))
];

// Ensure directories exist
if (!fs.existsSync(POSTERS_DIR)) {
    fs.mkdirSync(POSTERS_DIR, { recursive: true });
}

async function searchMovie(query, year) {
    let url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${TMDB_API_KEY}`;
    if (year) url += `&year=${year}`;

    try {
        const res = await axios.get(url);
        if (res.data.results && res.data.results.length > 0) {
            return res.data.results[0].id; // Return best match
        }
        return null;
    } catch (error) {
        console.error(`Error searching for ${query}:`, error.message);
        return null;
    }
}

async function getMovieDetails(id) {
    const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,similar,credits,release_dates`;
    try {
        const res = await axios.get(url);
        return res.data;
    } catch (error) {
        console.error(`Error fetching details for ID ${id}:`, error.message);
        return null;
    }
}

async function getWatchProviders(id, title) {
    const url = `https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${TMDB_API_KEY}`;
    try {
        const res = await axios.get(url);
        const results = res.data.results;

        // Prioritize India (IN), fallback to US, then Global logic if needed
        const region = results.IN || results.US || null;
        if (!region) return [];

        const providers = [];
        const seen = new Set();

        const addProvider = (p, type) => {
            if (seen.has(p.provider_name)) return;
            seen.add(p.provider_name);

            // Generate search links for major platforms
            let link = region.link; // Default generic link
            const nameLower = p.provider_name.toLowerCase();
            const titleEncoded = encodeURIComponent(title);

            if (nameLower.includes('netflix')) link = `https://www.netflix.com/search?q=${titleEncoded}`;
            else if (nameLower.includes('amazon prime') || nameLower.includes('prime video')) link = `https://www.amazon.in/s?k=${titleEncoded}&i=instant-video`;
            else if (nameLower.includes('hotstar') || nameLower.includes('disney')) link = `https://www.hotstar.com/in/search?q=${titleEncoded}`;
            else if (nameLower.includes('youtube')) link = `https://www.youtube.com/results?search_query=${titleEncoded}`;
            else if (nameLower.includes('apple')) link = `https://tv.apple.com/search?term=${titleEncoded}`;
            else if (nameLower.includes('jiocinema')) link = `https://www.jiocinema.com/search/${titleEncoded}`;
            else if (nameLower.includes('zee5')) link = `https://www.zee5.com/search?q=${titleEncoded}`;
            else if (nameLower.includes('sonyliv')) link = `https://www.sonyliv.com/search/${titleEncoded}`;

            providers.push({
                name: p.provider_name,
                type: type, // 'flatrate', 'rent', 'buy'
                link: link,
                logo: p.logo_path // Can be used for UI
            });
        };

        if (region.flatrate) region.flatrate.forEach(p => addProvider(p, 'Stream'));
        if (region.rent) region.rent.forEach(p => addProvider(p, 'Rent'));
        if (region.buy) region.buy.forEach(p => addProvider(p, 'Buy'));

        return providers;
    } catch (error) {
        console.error(`Error fetching providers for ID ${id}:`, error.message);
        return [];
    }
}

async function downloadPoster(posterPath, slug) {
    if (!posterPath) return null;
    // check if file already exists to avoid redownloading
    const outputPath = path.join(POSTERS_DIR, `${slug}.webp`);
    if (fs.existsSync(outputPath)) {
        return `/assets/images/posters/${slug}.webp`;
    }

    const imageUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;

    try {
        const response = await axios({
            url: imageUrl,
            responseType: 'arraybuffer'
        });

        await sharp(response.data)
            .resize(440, 660)
            .toFormat('webp')
            .toFile(outputPath);

        console.log(`Saved poster: ${slug}.webp`);
        return `/assets/images/posters/${slug}.webp`;
    } catch (error) {
        console.error(`Error downloading poster for ${slug}:`, error.message);
        return null;
    }
}

function getYouTubeTrailer(videos) {
    if (!videos || !videos.results) return '';
    // Priority: Official Trailer > Trailer > Teaser
    const officialTrailer = videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.name.includes('Official'));
    if (officialTrailer) return `https://www.youtube.com/embed/${officialTrailer.key}`;

    const trailer = videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    if (trailer) return `https://www.youtube.com/embed/${trailer.key}`;

    const teaser = videos.results.find(v => v.site === 'YouTube' && v.type === 'Teaser');
    if (teaser) return `https://www.youtube.com/embed/${teaser.key}`;

    return '';
}

function getRating(voteAverage) {
    return voteAverage ? voteAverage.toFixed(1) : 'N/A';
}

function isFeatured(tags) {
    // Logic: trending on netflix or highly anticipated
    // For now, let's say anything in 'Netflix' category with 'Trendng' tag is featured
    return tags.includes('Netflix') || tags.includes('Trending');
}

async function processMovies() {
    let existingData = [];
    if (fs.existsSync(MOVIES_FILE)) {
        existingData = JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf8'));
    }

    let maxId = existingData.reduce((max, m) => Math.max(max, m.id || 0), 0);

    for (const target of ALL_TARGETS) {
        const movieName = target.name;
        const targetYear = target.year;

        console.log(`Processing: ${movieName} (${targetYear || 'Any'})`);

        // Check if already exists in JSON to merge tags or skip fetch
        // We fetch fresh to update data/stats but avoid ID dupes

        const id = await searchMovie(movieName, targetYear);
        if (!id) {
            console.log(`Movie not found: ${movieName}`);
            continue;
        }

        const details = await getMovieDetails(id);
        if (!details) continue;

        const slug = slugify(details.title, { lower: true, strict: true });
        const posterLocalPath = await downloadPoster(details.poster_path, slug);
        const providers = await getWatchProviders(id, details.title);

        // Determine tags: merge target tags with genre names? 
        // User asked specifically for: Trending, Country, Platform
        // We have manual tags. Let's append Genres from TMDB too? 
        // "Genres" field in schema exists. Tags is new.
        // Let's keep `tags` strictly for our categorization logic.

        let finalTags = [...target.tags];
        if (details.popularity && details.popularity > 50) {
            finalTags.push('Trending');
        }
        // Ensure unique
        finalTags = [...new Set(finalTags)];

        const wordLimit = (str, limit) => {
            if (!str) return '';
            const words = str.split(/\s+/);
            return words.length > limit ? words.slice(0, limit).join(' ') + '...' : str;
        };
        const descriptionShort = wordLimit(details.overview, 250);

        const movieData = {
            id: null, // assigned below
            title: details.title,
            slug: slug,
            year: details.release_date ? parseInt(details.release_date.substring(0, 4)) : (targetYear || 'Coming Soon'),
            genre: details.genres.length > 0 ? details.genres[0].name : "Unknown", // Primary Genre
            genres: details.genres.map(g => g.name), // All genres (new field maybe? sticking to schema for now, map to single genre or update schema)
            // Existing schema uses single 'genre' string. I'll stick to that for compatibility, but maybe update if multi-genre needed.
            // I will strictly follow existing schema but add 'tags'.
            rating: getRating(details.vote_average),
            duration: details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : 'TBA',
            poster: posterLocalPath || details.poster_path,
            trailer: getYouTubeTrailer(details.videos),
            description: descriptionShort,
            platforms: providers.map(p => p.name).slice(0, 2), // Keep for legacy/UI display summaries
            providers: providers, // Full structured data
            language: details.original_language.toUpperCase(),
            tags: finalTags,
            featured: isFeatured(finalTags)
        };

        const existingIndex = existingData.findIndex(m => m.slug === slug);
        if (existingIndex >= 0) {
            // Update existng
            movieData.id = existingData[existingIndex].id;
            // Merge tags if we are re-processing a movie that was already there but now has new context
            const existingTags = existingData[existingIndex].tags || [];
            movieData.tags = [...new Set([...existingTags, ...finalTags])];
            existingData[existingIndex] = movieData;
            console.log(`Updated: ${movieName}`);
        } else {
            // Add new
            movieData.id = ++maxId;
            existingData.push(movieData);
            console.log(`Added: ${movieName}`);
        }
    }

    fs.writeFileSync(MOVIES_FILE, JSON.stringify(existingData, null, 2));
    console.log('Done! valid movies.json generated.');
}

processMovies();
