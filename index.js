require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const cors = require('cors');
const fuzzysort = require('fuzzysort');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;
const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

const animeSchema = new mongoose.Schema({
    mal_id: Number,
    title: String,
    synopsis: String,
    type: String,
    episodes: Number,
    score: Number,
    genres: [String],
    image_url: String,
    banner_url: String,
    source: String,
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Anime = mongoose.model('Anime', animeSchema);

app.use(cors());
app.use(express.static('public'));

// 🟢 Helper: Fetch from MAL API
const fetchFromMAL = async (query) => {
    try {
        const response = await axios.get(`https://api.myanimelist.net/v2/anime?q=${query}&limit=5`, {
            headers: { "X-MAL-CLIENT-ID": MAL_CLIENT_ID }
        });
        return response.data.data.map(a => ({
            mal_id: a.node.id,
            title: a.node.title,
            image_url: a.node.main_picture.large
        }));
    } catch (error) {
        console.error("❌ MAL API Error:", error.message);
        return [];
    }
};

// 🟢 Helper: Fetch from Jikan API
const fetchFromJikan = async (query) => {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${query}&limit=5`);
        return response.data.data.map(a => ({
            mal_id: a.mal_id,
            title: a.title,
            image_url: a.images.jpg.large_image_url
        }));
    } catch (error) {
        console.error("❌ Jikan API Error:", error.message);
        return [];
    }
};

// 🔍 **Fuzzy Search with MongoDB**
app.get('/search/:query', async (req, res) => {
    const query = req.params.query;
    let results = await Anime.find({}, 'mal_id title image_url');

    // 🔥 Use Fuzzy Search
    const fuzzyResults = fuzzysort.go(query, results, { key: 'title' }).map(r => r.obj);

    if (fuzzyResults.length === 0) {
        console.log("🔍 Fetching from API...");
        const malResults = await fetchFromMAL(query);
        const jikanResults = await fetchFromJikan(query);

        // Merge results
        const mergedResults = [...new Map([...malResults, ...jikanResults].map(a => [a.mal_id, a])).values()];

        // Store in MongoDB
        await Anime.insertMany(mergedResults, { ordered: false }).catch(() => {});

        return res.json(mergedResults);
    }

    res.json(fuzzyResults);
});

// 📌 **Top Anime**
app.get('/meta/top', async (req, res) => {
    try {
        const { data } = await axios.get('https://api.jikan.moe/v4/top/anime');
        res.json(data.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch top anime" });
    }
});

// 📌 **Popular Anime**
app.get('/meta/popular', async (req, res) => {
    try {
        const { data } = await axios.get('https://api.jikan.moe/v4/top/anime?filter=bypopularity');
        res.json(data.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch popular anime" });
    }
});

// 📌 **New Season Anime**
app.get('/meta/new-season', async (req, res) => {
    try {
        const { data } = await axios.get('https://api.jikan.moe/v4/seasons/now');
        res.json(data.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch new season anime" });
    }
});

// 📌 **Banner for Top Airing Anime**
app.get('/meta/banner', async (req, res) => {
    try {
        const { data } = await axios.get('https://api.jikan.moe/v4/top/anime?filter=airing');
        const banners = data.data.map(a => ({ title: a.title, banner: a.images.jpg.large_image_url }));
        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch banners" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
