require("dotenv").config();
const axios = require("axios");

const CLIENT_ID = process.env.MAL_CLIENT_ID;

module.exports = async (req, res) => {
    try {
        const { type, query } = req.query;
        let apiUrl = "";

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

                // Fetch full anime details from MAL
                const malData = await axios.get(`https://api.myanimelist.net/v2/anime/${query}?fields=id,title,main_picture,synopsis,genres,status,episodes,studios,mean,start_date,end_date,rank,popularity,media_type,source,average_episode_duration`, {
                    headers: { "X-MAL-CLIENT-ID": CLIENT_ID }
                });

                // Fetch cast, staff, and theme songs from Jikan API
                const jikanData = await axios.get(`https://api.jikan.moe/v4/anime/${query}/full`);

                return res.json({
                    ...malData.data,
                    characters: jikanData.data.data.characters?.map(c => ({
                        name: c.character.name,
                        image: c.character.images.jpg.image_url,
                        role: c.role,
                        voice_actors: c.voice_actors.map(va => ({
                            name: va.person.name,
                            language: va.language,
                            image: va.person.images.jpg.image_url
                        }))
                    })) || [],
                    staff: jikanData.data.data.staff?.map(s => ({
                        name: s.person.name,
                        image: s.person.images.jpg.image_url,
                        role: s.positions
                    })) || [],
                    theme_songs: {
                        openings: jikanData.data.data.theme.openings || [],
                        endings: jikanData.data.data.theme.endings || []
                    }
                });

            case "spotlights":
                apiUrl = `https://api.myanimelist.net/v2/anime/ranking?ranking_type=favorite&limit=10`;
                break;
            default:
                return res.status(404).json({ error: "Invalid API route" });
        }

        const response = await axios.get(apiUrl, {
            headers: { "X-MAL-CLIENT-ID": CLIENT_ID }
        });

        return res.json(response.data);
    } catch (error) {
        console.error("API Error:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error", details: error.response?.data || error.message });
    }
};
