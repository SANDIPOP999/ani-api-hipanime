require("dotenv").config();
const axios = require("axios");

const CLIENT_ID = process.env.MAL_CLIENT_ID;

module.exports = async (req, res) => {
    try {
        const { type } = req.query;

        if (type === "trending") {
            // Fetch Top 10 Trending Anime from MAL
            const malResponse = await axios.get(
                `https://api.myanimelist.net/v2/anime/ranking?ranking_type=bypopularity&limit=10`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );

            // Get banners for each anime
            const trendingAnime = await Promise.all(
                malResponse.data.data.map(async (anime) => {
                    const malId = anime.node.id;

                    // Fetch banner from Jikan API
                    let banner = null;
                    try {
                        const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`);
                        banner = jikanRes.data.data.images.jpg.large_image_url || null;
                    } catch (err) {
                        console.error(`Jikan API failed for ${malId}`);
                    }

                    // Fallback to MAL cover image if no banner found
                    if (!banner) {
                        banner = anime.node.main_picture.large || anime.node.main_picture.small;
                    }

                    return {
                        id: malId,
                        title: anime.node.title,
                        banner
                    };
                })
            );

            return res.json(trendingAnime.filter(Boolean));
        }

        return res.status(404).json({ error: "Invalid API route" });
    } catch (error) {
        console.error("API Error:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
