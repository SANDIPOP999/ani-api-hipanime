require("dotenv").config();
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const FuzzySearch = require("fuzzy-search");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// OAuth Credentials (Replace with actual credentials)
const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;

// ✅ Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Mongoose Schema for Storing Anime Data
const AnimeSchema = new mongoose.Schema({
    mal_id: { type: Number, unique: true },
    title: String,
    title_romaji: String,
    title_english: String,
    synonyms: [String],
    rating: String,
    total_episodes: String,
    cover_image: String
});
const Anime = mongoose.model("Anime", AnimeSchema);

// ✅ Fetch Anime Data (Limited to 24 results)
const fetchFilteredAnimeData = async (url, res, errorMsg) => {
    try {
        const { data } = await axios.get(url);
        const filteredData = data.data.slice(0, 24).map(anime => ({
            mal_id: anime.mal_id,
            title: anime.title,
            title_romaji: anime.title_english || "Unknown",
            title_english: anime.title_english || "Unknown",
            rating: anime.rating,
            total_episodes: anime.episodes || "Unknown",
            cover_image: anime.images?.jpg?.large_image_url || null
        }));
        res.json(filteredData);
    } catch (error) {
        console.error(`❌ ${errorMsg}:`, error.message);
        res.status(500).json({ error: errorMsg });
    }
};

// ✅ Fetch Top Anime Categories (Limited to 24)
app.get("/meta/top-airing", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/top/anime?filter=airing", res, "Failed to fetch top airing anime."));
app.get("/meta/popular", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/top/anime?filter=bypopularity", res, "Failed to fetch popular anime."));
app.get("/meta/top-tv", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/top/anime?type=tv", res, "Failed to fetch top TV anime."));
app.get("/meta/top-movies", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/top/anime?type=movie", res, "Failed to fetch top movies."));
app.get("/meta/new-releases", (req, res) => fetchFilteredAnimeData("https://api.jikan.moe/v4/seasons/now", res, "Failed to fetch new releases."));

// ✅ Fetch Banners (Limited to 15)
app.get("/meta/banners", async (req, res) => {
    try {
        const { data } = await axios.get("https://api.jikan.moe/v4/top/anime?filter=airing");
        const banners = data.data.slice(0, 15).map(anime => ({
            mal_id: anime.mal_id,
            title: anime.title,
            title_romaji: anime.title_english || "Unknown",
            title_english: anime.title_english || "Unknown",
            total_episodes: anime.episodes || "Unknown",
            cover_image: anime.images?.jpg?.large_image_url || null
        }));
        res.json(banners);
    } catch (error) {
        console.error("❌ Failed to fetch banners:", error.message);
        res.status(500).json({ error: "Failed to fetch banners." });
    }
});

// ✅ Fetch Anime Schedule (Requires OAuth Token)
app.get("/meta/schedule", async (req, res) => {
    try {
        const { data } = await axios.get("https://animeschedule.net/api/v3/schedule", {
            headers: {
                Authorization: `Bearer ${TOKEN}`
            }
        });
        res.json(data);
    } catch (error) {
        console.error("❌ Failed to fetch anime schedule:", error.message);
        res.status(500).json({ error: "Failed to fetch anime schedule." });
    }
});

// ✅ Search Anime (MongoDB + Jikan API)
app.get("/search", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Query is required" });

        console.log(`🔎 Searching for: ${query}`);
        const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10`);

        const animeList = data.data
            .filter(anime => anime.mal_id)
            .map(anime => ({
                mal_id: anime.mal_id,
                title: anime.title,
                title_romaji: anime.title_english || "Unknown",
                title_english: anime.title_english || "Unknown",
                synonyms: anime.title_synonyms || [],
                rating: anime.rating,
                total_episodes: anime.episodes || "Unknown",
                cover_image: anime.images?.jpg?.large_image_url || null
            }));

        for (let anime of animeList) {
            await Anime.updateOne({ mal_id: anime.mal_id }, { $set: anime }, { upsert: true });
        }

        const allAnime = await Anime.find();
        const searcher = new FuzzySearch(allAnime, ["title", "title_romaji", "title_english", "synonyms"], { caseSensitive: false });

        res.json(searcher.search(query));
    } catch (error) {
        console.error("❌ Search Error:", error.message);
        res.status(500).json({ error: "Search failed." });
    }
});

// ✅ Fetch Anime Details by ID (Includes `season` and `year`)
app.get("/anime/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = await axios.get(`https://api.jikan.moe/v4/anime/${id}`);

        const animeDetails = {
            mal_id: data.data.mal_id,
            title: data.data.title,
            title_romaji: data.data.title_english || "Unknown",
            title_english: data.data.title_english || "Unknown",
            description: data.data.synopsis || "No description available",
            rating: data.data.rating || "Unknown",
            total_episodes: data.data.episodes || "Unknown",
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
        console.error("❌ Failed to fetch anime details:", error.message);
        res.status(500).json({ error: "Failed to fetch anime details." });
    }
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
