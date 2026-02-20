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

    const tmdbId = req.query.id;

    if (!tmdbId) {
        return res.status(400).json({ error: 'TMDB ID is required' });
    }

    try {
        // Fetch movie details containing standard data, videos (trailers), and watch providers (OTT)
        const tmdbResponse = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
            params: {
                api_key: process.env.TMDB_API_KEY,
                append_to_response: 'videos,watch/providers',
                language: 'en-US'
            }
        });

        // Cache results for 24 hours at edge as movie details rarely change rapidly
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

        return res.status(200).json(tmdbResponse.data);
    } catch (error) {
        console.error('TMDB Movie Detail Error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Failed to fetch movie details from TMDB' });
    }
};
