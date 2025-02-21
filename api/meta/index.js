require("dotenv").config();
const axios = require("axios");

const CLIENT_ID = process.env.MAL_CLIENT_ID;

module.exports = async (req, res) => {
    try {
        const { type, id, query } = req.query;

        if (type === "banner") {
            // Fetch Top 10 Airing Anime from MAL
            const malResponse = await axios.get(
                `https://api.myanimelist.net/v2/anime/ranking?ranking_type=airing&limit=10`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );

            // Get banners from Kitsu or MAL
            const banners = await Promise.all(
                malResponse.data.data.map(async (anime) => {
                    const malId = anime.node.id;
                    const title = anime.node.title;
                    let banner = null;

                    try {
                        // 🔹 Fetch Banner from Kitsu
                        const kitsuRes = await axios.get(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}`);
                        if (kitsuRes.data.data.length > 0) {
                            banner = kitsuRes.data.data[0].attributes.coverImage?.original || null;
                        }
                    } catch (err) {
                        console.error(`Kitsu API failed for ${title}`);
                    }

                    // 🔹 Fallback to MAL Cover if no banner found
                    if (!banner) {
                        banner = anime.node.main_picture.large || anime.node.main_picture.small;
                    }

                    return { id: malId, title: title, banner: banner };
                })
            );

            return res.json(banners);
        }

        if (type === "info" && id) {
            // Fetch anime details from MAL
            const animeInfo = await axios.get(
                `https://api.myanimelist.net/v2/anime/${id}?fields=id,title,synopsis,main_picture,start_date,end_date,genres,studios,source,rank,season,mean,media_type,status`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );

            // Fetch theme songs (OP & ED)
            let themeSongs = { opening: [], ending: [] };
            try {
                const themeRes = await axios.get(`https://api.animethemes.moe/anime/${id}`);
                if (themeRes.data.anime) {
                    themeSongs.opening = themeRes.data.anime.themeSongs.opening || [];
                    themeSongs.ending = themeRes.data.anime.themeSongs.ending || [];
                }
            } catch (err) {
                console.error(`Theme songs not found for ${animeInfo.data.title}`);
            }

            // Fetch voice actors & staff
            let cast = [];
            try {
                const castRes = await axios.get(`https://api.myanimelist.net/v2/anime/${id}/characters_staff`, {
                    headers: { "X-MAL-CLIENT-ID": CLIENT_ID }
                });
                cast = castRes.data.characters || [];
            } catch (err) {
                console.error(`Cast details not found for ${animeInfo.data.title}`);
            }

            // Fetch banner from Kitsu
            let banner = null;
            try {
                const kitsuRes = await axios.get(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(animeInfo.data.title)}`);
                if (kitsuRes.data.data.length > 0) {
                    banner = kitsuRes.data.data[0].attributes.coverImage?.original || null;
                }
            } catch (err) {
                console.error(`Banner not found for ${animeInfo.data.title}`);
            }

            return res.json({
                id: animeInfo.data.id,
                title: animeInfo.data.title,
                synopsis: animeInfo.data.synopsis,
                main_picture: animeInfo.data.main_picture.large || animeInfo.data.main_picture.small,
                banner: banner || animeInfo.data.main_picture.large,
                start_date: animeInfo.data.start_date,
                end_date: animeInfo.data.end_date,
                genres: animeInfo.data.genres.map((g) => g.name),
                studios: animeInfo.data.studios,
                source: animeInfo.data.source,
                rank: animeInfo.data.rank,
                season: animeInfo.data.season,
                mean_score: animeInfo.data.mean,
                media_type: animeInfo.data.media_type,
                status: animeInfo.data.status,
                theme_songs: themeSongs,
                cast: cast
            });
        }

        if (type === "search" && query) {
            // Search anime on MAL
            const searchResponse = await axios.get(
                `https://api.myanimelist.net/v2/anime?q=${query}&limit=10`,
                { headers: { "X-MAL-CLIENT-ID": CLIENT_ID } }
            );

            return res.json(searchResponse.data);
        }

        res.status(400).json({ error: "Invalid request" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
