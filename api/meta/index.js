require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const Fuse = require("fuse.js");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID;

// MongoDB Connection
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Define Anime Schema
const animeSchema = new mongoose.Schema({
    mal_id: Number,
    title: String,
    title_english: String,
    type: String,
    status: String,
    season: String,
    year: Number,
    score: Number,
    rank: Number,
    popularity: Number,
    genres: [String],
    studios: [String],
    image: String,
    trailer: String,
    mal_url: String,
    synopsis: String
});

const Anime = mongoose.model("Anime", animeSchema);

// Fetch Data from Both MAL & Jikan
async function fetchAnimeDetails(mal_id) {
    try {
        // Fetch from Jikan
        const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime/${mal_id}/full`);
        const jikanData = jikanRes.data.data;

        // Fetch from MAL
        const malRes = await axios.get(`https://api.myanimelist.net/v2/anime/${mal_id}?fields=id,title,main_picture,genres,studios,synopsis`,
            { headers: { "X-MAL-CLIENT-ID": MAL_CLIENT_ID } });
        const malData = malRes.data;

        // Merge Data
        return {
            mal_id,
            title: malData.title || jikanData.title,
            title_english: jikanData.title_english || malData.title,
            type: jikanData.type,
            status: jikanData.status,
            season: jikanData.season,
            year: jikanData.year,
            score: jikanData.score,
            rank: jikanData.rank,
            popularity: jikanData.popularity,
            genres: jikanData.genres.map(g => g.name),
            studios: jikanData.studios.map(s => s.name),
            image: malData.main_picture?.large || jikanData.images?.jpg?.large_image_url,
            trailer: jikanData.trailer?.url || null,
            mal_url: `https://myanimelist.net/anime/${mal_id}`,
            synopsis: malData.synopsis || jikanData.synopsis
        };
    } catch (err) {
        console.error(`❌ Error fetching anime (ID: ${mal_id}):`, err.message);
        return null;
    }
}

// Fetch & Store Anime Data
async function fetchAndStoreAnime() {
    try {
        console.log("🔄 Fetching anime data...");
        const { data } = await axios.get("https://api.jikan.moe/v4/top/anime");

        for (const anime of data.data) {
            const existingAnime = await Anime.findOne({ mal_id: anime.mal_id });
            const animeData = await fetchAnimeDetails(anime.mal_id);

            if (!animeData) continue; // Skip if failed to fetch

            if (existingAnime) {
                await Anime.updateOne({ mal_id: anime.mal_id }, animeData);
            } else {
                await Anime.create(animeData);
            }
        }
        console.log("✅ Anime data updated successfully!");
    } catch (err) {
        console.error("❌ Error fetching anime data:", err);
    }
}

// Fetch Anime Every 12 Hours
setInterval(fetchAndStoreAnime, 12 * 60 * 60 * 1000);
fetchAndStoreAnime();

// Search Endpoint (Fuzzy Search)
app.get("/search", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing search query" });

    try {
        const animes = await Anime.find();
        const fuse = new Fuse(animes, { keys: ["title", "title_english"], threshold: 0.3 });
        const results = fuse.search(query).map(result => result.item);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get Anime Metadata
app.get("/meta/:id", async (req, res) => {
    try {
        const anime = await Anime.findOne({ mal_id: req.params.id });
        if (!anime) return res.status(404).json({ error: "Anime not found" });
        res.json(anime);
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get Trending Anime Banners
app.get("/meta/banner", async (req, res) => {
    try {
        const trendingAnime = await Anime.find().sort({ popularity: 1 }).limit(10);
        const banners = trendingAnime.map(a => ({ title: a.title, image: a.image }));
        res.json(banners);
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start Express Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
