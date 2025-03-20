require("dotenv").config();
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const FuzzySearch = require("fuzzy-search");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const ANIME_SCHEDULE_TOKEN = process.env.ANIME_SCHEDULE_TOKEN; // Token for AnimeSchedule API

// ✅ Connect to MongoDB for Fuzzy Search
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Convert Duration to Minutes
const convertToMinutes = (duration) => {
    if (!duration) return "Unknown";
    
    const match = duration.match(/(\d+)\s*hour[s]?\s*(\d*)\s*min/);
    if (match) {
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        return `${(hours * 60) + minutes} min`;
    }

    const onlyMinutes = duration.match(/(\d+)\s*min/);
    if (onlyMinutes) {
        return `${onlyMinutes[1]} min`;
    }

    return "Unknown";
};

// ✅ Fetch Data from Jikan API with a Limit of 24
const fetchFilteredAnimeData = async (url, res, errorMsg) => {
    try {
        const { data } = await axios.get(url);
        const filteredData = data.data.slice(0, 24).map(anime => ({
            mal_id: anime.mal_id,
            title: anime.title,
            title_romaji: anime.title_english || anime.title,
            title_english: anime.title_english || "Unknown",
            rating: anime.rating,
            total_episodes: anime.episodes || "Unknown",
            type: anime.type || "Unknown",
            episode_duration: convertToMinutes(anime.duration),
            cover_image: anime.images?.jpg?.large_image_url || null
        }));
        res.json(filteredData);
    } catch (error) {
        console.error(`❌ ${errorMsg}:`, error.message);
        res.status(500).json({ error: errorMsg });
    }
};

// ✅ Fetch Top Anime Categories (Limited to 24 Results)
app.get("/meta/top-airing", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/top/anime?filter=airing", res, "Failed to fetch top airing anime."));
app.get("/meta/popular", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/top/anime?filter=bypopularity", res, "Failed to fetch popular anime."));
app.get("/meta/top-tv", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/top/anime?type=tv", res, "Failed to fetch top TV anime."));
app.get("/meta/top-movies", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/top/anime?type=movie", res, "Failed to fetch top movies."));
app.get("/meta/new-releases", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/seasons/now", res, "Failed to fetch new releases."));

// ✅ Fetch Anime Schedule from AnimeSchedule API
app.get("/meta/schedule", async (req, res) => {
    try {
        console.log("🔄 Fetching anime schedule...");
        const response = await axios.get("https://animeschedule.net/api/v3/schedule", {
            headers: { Authorization: `Bearer ${ANIME_SCHEDULE_TOKEN}` }
        });

        console.log("✅ Schedule Data:", response.data);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Failed to fetch anime schedule:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch anime schedule.", details: error.response?.data || error.message });
    }
});

// ✅ Fetch Anime Details by ID (`/anime/:id`)
app.get("/anime/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔎 Fetching details for Anime ID: ${id}`);

        const { data } = await axios.get(`https://api.jikan.moe/v4/anime/${id}`);
        console.log("✅ API Response:", data);

        const animeDetails = {
            mal_id: data.data.mal_id,
            title: data.data.title,
            title_romaji: data.data.title_english || data.data.title,
            title_english: data.data.title_english || "Unknown",
            description: data.data.synopsis || "No description available",
            rating: data.data.rating || "Unknown",
            total_episodes: data.data.episodes || "Unknown",
            type: data.data.type || "Unknown",
            episode_duration: convertToMinutes(data.data.duration),
            season: data.data.season || "Unknown",
            year: data.data.year || "Unknown",
            aired: data.data.aired?.string || "Unknown",
            broadcast: data.data.broadcast?.string || "Unknown",
            studios: data.data.studios?.map(studio => studio.name) || [],
            producers: data.data.producers?.map(producer => producer.name) || [],
            genres: data.data.genres?.map(genre => genre.name) || [],
            cover_image: data.data.images?.jpg?.large_image_url || null
        };

        res.json(animeDetails);
    } catch (error) {
        console.error("❌ Error fetching anime details:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch anime details.", details: error.response?.data || error.message });
    }
});

// ✅ Anime Search with Fuzzy Search
app.get("/search", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Query is required" });

        console.log(`🔎 Searching for: ${query}`);
        const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10`);

        const animeList = data.data.map(anime => ({
            mal_id: anime.mal_id,
            title: anime.title,
            title_romaji: anime.title_english || anime.title,
            title_english: anime.title_english || "Unknown",
            rating: anime.rating,
            total_episodes: anime.episodes || "Unknown",
            type: anime.type || "Unknown",
            episode_duration: convertToMinutes(anime.duration),
            cover_image: anime.images?.jpg?.large_image_url || null
        }));

        res.json(animeList);
    } catch (error) {
        console.error("❌ Search Error:", error.message);
        res.status(500).json({ error: "Search failed." });
    }
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
