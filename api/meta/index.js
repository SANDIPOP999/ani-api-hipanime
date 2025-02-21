require("dotenv").config();
const axios = require("axios");

const CLIENT_ID = process.env.MAL_CLIENT_ID;  // Store in .env

module.exports = async (req, res) => {
    try {
        const { type, query } = req.query;
        let apiUrl = "";

        // Select the correct endpoint based on the request type
        switch (type) {
            case "banner":
                apiUrl = `https://api.myanimelist.net/v2/anime/ranking?ranking_type=all&limit=10`;
                break;
            case "trending":
                apiUrl = `https://api.myanimelist.net/v2/anime/ranking?ranking_type=bypopularity&limit=10`;
                break;
            case "upcoming":
                apiUrl = `https://api.myanimelist.net/v2/anime/ranking?ranking_type=upcoming&limit=10`;
                break;
            case "search":
                if (!query) return res.status(400).json({ error: "Missing query parameter" });
                apiUrl = `https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(query)}&limit=10`;
                break;
            case "info":
                if (!query) return res.status(400).json({ error: "Missing anime ID" });
                apiUrl = `https://api.myanimelist.net/v2/anime/${query}`;
                break;
            case "spotlights":
                apiUrl = `https://api.myanimelist.net/v2/anime/ranking?ranking_type=favorite&limit=10`;
                break;
            default:
                return res.status(404).json({ error: "Invalid API route" });
        }

        // Fetch data from MAL API
        const response = await axios.get(apiUrl, {
            headers: { "X-MAL-CLIENT-ID": CLIENT_ID }
        });

        return res.json(response.data);
    } catch (error) {
        console.error("API Error:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error", details: error.response?.data || error.message });
    }
};
