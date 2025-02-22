const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/anime_db";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Anime Schema for Caching & Fuzzy Search
const AnimeSchema = new mongoose.Schema({
    mal_id: Number,
    title: String,
    synopsis: String,
    genres: [String],
    episodes: Number,
    status: String,
    type: String,
    aired: String,
    rating: String,
    score: Number,
    popularity: Number,
    members: Number,
    image_url: String,
});
const Anime = mongoose.model("Anime", AnimeSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));  // Serve `index.html` from `public` folder

const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID;

// Fetch data from both Jikan & MAL
const fetchAnimeData = async (url, isMAL = false) => {
    try {
        const headers = isMAL ? { "X-MAL-CLIENT-ID": MAL_CLIENT_ID } : {};
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error("❌ API Fetch Error:", error.message);
        return null;
    }
};

// Routes
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.get("/api/meta/popular", async (req, res) => {
    const data = await fetchAnimeData("https://api.jikan.moe/v4/top/anime");
    res.json(data);
});

app.get("/api/meta/new-season", async (req, res) => {
    const data = await fetchAnimeData("https://api.jikan.moe/v4/seasons/now");
    res.json(data);
});

app.get("/api/meta/top-airing", async (req, res) => {
    const data = await fetchAnimeData("https://api.jikan.moe/v4/top/anime?filter=airing");
    res.json(data);
});

app.get("/api/meta/movies", async (req, res) => {
    const data = await fetchAnimeData("https://api.jikan.moe/v4/top/anime?type=movie");
    res.json(data);
});

app.get("/api/meta/tv-series", async (req, res) => {
    const data = await fetchAnimeData("https://api.jikan.moe/v4/top/anime?type=tv");
    res.json(data);
});

app.get("/api/meta/ovas", async (req, res) => {
    const data = await fetchAnimeData("https://api.jikan.moe/v4/top/anime?type=ova");
    res.json(data);
});

app.get("/api/meta/onas", async (req, res) => {
    const data = await fetchAnimeData("https://api.jikan.moe/v4/top/anime?type=ona");
    res.json(data);
});

app.get("/api/meta/specials", async (req, res) => {
    const data = await fetchAnimeData("https://api.jikan.moe/v4/top/anime?type=special");
    res.json(data);
});

app.get("/api/meta/genre/:genre", async (req, res) => {
    const genre = req.params.genre.toLowerCase();
    const data = await fetchAnimeData(`https://api.jikan.moe/v4/anime?genres=${genre}`);
    res.json(data);
});

app.get("/api/meta/search/:query", async (req, res) => {
    const query = req.params.query;
    const data = await fetchAnimeData(`https://api.jikan.moe/v4/anime?q=${query}`);
    res.json(data);
});

// **Fuzzy Search from MongoDB**
app.get("/api/meta/fuzzy-search/:query", async (req, res) => {
    try {
        const query = req.params.query;
        const results = await Anime.find({ title: new RegExp(query, "i") }).limit(10);
        res.json(results);
    } catch (error) {
        console.error("❌ Fuzzy Search Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
