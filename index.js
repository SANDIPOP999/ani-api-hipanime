require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const Fuse = require('fuse.js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

const AnimeSchema = new mongoose.Schema({
    mal_id: Number,
    title: String,
    genres: [String],
    type: String,
    airing: Boolean,
    score: Number,
    image_url: String,
    banner_url: String
});
const Anime = mongoose.model('Anime', AnimeSchema);

const JIKAN_API = "https://api.jikan.moe/v4";
const MAL_API = "https://api.myanimelist.net/v2";

const malAxios = axios.create({
    headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID }
});

const fetchBanner = async (mal_id) => {
    try {
        const malResponse = await malAxios.get(`${MAL_API}/anime/${mal_id}?fields=main_picture`);
        return malResponse.data.main_picture?.large || malResponse.data.main_picture?.medium || null;
    } catch {
        return null;
    }
};

const fetchAnimeDetails = async (mal_id) => {
    try {
        const jikanResponse = await axios.get(`${JIKAN_API}/anime/${mal_id}`);
        const banner = await fetchBanner(mal_id);
        return { ...jikanResponse.data.data, banner_url: banner };
    } catch {
        return null;
    }
};

const fetchTopAnime = async (filter) => {
    try {
        const response = await axios.get(`${JIKAN_API}/top/anime?filter=${filter}`);
        return response.data.data.map(anime => ({
            mal_id: anime.mal_id,
            title: anime.title,
            type: anime.type,
            score: anime.score,
            image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url
        }));
    } catch {
        return [];
    }
};

const fetchAnimeByGenre = async (genre_id) => {
    try {
        const response = await axios.get(`${JIKAN_API}/anime?genres=${genre_id}`);
        return response.data.data;
    } catch {
        return [];
    }
};

// Serve Static Files (Landing Page)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/meta/popular', async (req, res) => {
    const data = await fetchTopAnime('bypopularity');
    res.json({ status: "success", data });
});

app.get('/meta/top-airing', async (req, res) => {
    const data = await fetchTopAnime('airing');
    res.json({ status: "success", data });
});

app.get('/meta/new-season', async (req, res) => {
    const data = await fetchTopAnime('upcoming');
    res.json({ status: "success", data });
});

app.get('/meta/genre/:id', async (req, res) => {
    const data = await fetchAnimeByGenre(req.params.id);
    res.json({ status: "success", data });
});

app.get('/meta/anime/:id', async (req, res) => {
    const data = await fetchAnimeDetails(req.params.id);
    res.json({ status: "success", data });
});

app.get('/meta/search/:query', async (req, res) => {
    try {
        const animeList = await Anime.find({});
        const fuse = new Fuse(animeList, { keys: ['title'], threshold: 0.4 });
        const results = fuse.search(req.params.query).map(result => result.item);
        res.json({ status: "success", data: results });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Search failed" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
