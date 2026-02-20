const axios = require('axios');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const query = req.query.q;

    if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    try {
        const tmdbResponse = await axios.get('https://api.themoviedb.org/3/search/movie', {
            params: {
                api_key: process.env.TMDB_API_KEY,
                query: query,
                include_adult: false,
                language: 'en-US',
                page: 1
            }
        });

        // Cache results for 1 hour at edge
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

        return res.status(200).json(tmdbResponse.data);
    } catch (error) {
        console.error('TMDB Search Error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Failed to fetch search results from TMDB' });
    }
};
