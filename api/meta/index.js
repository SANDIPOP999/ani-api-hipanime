require("dotenv").config();
const axios = require("axios");

const CLIENT_ID = process.env.MAL_CLIENT_ID;

module.exports = async (req, res) => {
    try {
        const { type, query, id } = req.query;

        if (type === "banner") {
            // Fetch Top 10 Airing Anime (For Wide Banners)
            const malResponse = await axios.get(
                `https://api.myanimelist.net/v2/anime/ranking?ranking_type=airing&limit=10`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );

            // Get banners for each anime
            const banners = await Promise.all(
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

            return res.json(banners.filter(Boolean));
        }

        if (type === "info" && id) {
            // Fetch Anime Details from MAL
            const animeResponse = await axios.get(
                `https://api.myanimelist.net/v2/anime/${id}?fields=id,title,synopsis,episodes,status,genres,mean,rank,pictures,related_anime,studios,theme,theme_songs,trailer`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );

            const anime = animeResponse.data;

            // Fetch Additional Info from Jikan API
            const jikanResponse = await axios.get(`https://api.jikan.moe/v4/anime/${id}/full`);
            const jikanData = jikanResponse.data.data;

            return res.json({
                id: anime.id,
                title: anime.title,
                synopsis: anime.synopsis,
                episodes: anime.episodes,
                duration: jikanData.duration,  // Episode duration
                status: anime.status,
                airing: jikanData.airing,
                season: jikanData.season ? `${jikanData.season} ${jikanData.year}` : "Unknown",
                score: anime.mean,
                rank: anime.rank,
                genres: anime.genres.map(g => g.name),
                trailer: anime.trailer?.url || null,
                studios: anime.studios.map(s => s.name),
                banner: jikanData.images.jpg.large_image_url || anime.pictures?.[0]?.large || null,
                cast: jikanData.characters?.map(c => ({
                    name: c.character.name,
                    role: c.role,
                    image: c.character.images.jpg.image_url
                })) || [],
                theme_songs: jikanData.theme.openings.concat(jikanData.theme.endings) || [],
                related_anime: jikanData.relations?.map(r => ({
                    relation: r.relation,
                    title: r.entry[0]?.name,
                    id: r.entry[0]?.mal_id,
                    image: r.entry[0]?.images.jpg.image_url
                })) || []
            });
        }

        if (type === "top_airing") {
            // Fetch Top Airing Anime
            const response = await axios.get(
                `https://api.myanimelist.net/v2/anime/ranking?ranking_type=airing&limit=10`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );
            return res.json(response.data.data.map(anime => ({
                id: anime.node.id,
                title: anime.node.title,
                image: anime.node.main_picture.large
            })));
        }

        if (type === "recent") {
            // Fetch Recently Released Anime
            const response = await axios.get(
                `https://api.myanimelist.net/v2/anime/season/now?limit=10`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );
            return res.json(response.data.data.map(anime => ({
                id: anime.node.id,
                title: anime.node.title,
                image: anime.node.main_picture.large
            })));
        }

        if (type === "search" && query) {
            // Search Anime
            const response = await axios.get(
                `https://api.myanimelist.net/v2/anime?q=${query}&limit=10`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );
            return res.json(response.data.data.map(anime => ({
                id: anime.node.id,
                title: anime.node.title,
                image: anime.node.main_picture.large
            })));
        }

        return res.status(404).json({ error: "Invalid API route" });
    } catch (error) {
        console.error("API Error:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
