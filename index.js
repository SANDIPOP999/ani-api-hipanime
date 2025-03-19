require("dotenv").config();
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const FuzzySearch = require("fuzzy-search");
const querystring = require("querystring");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// OAuth Tokens (temporary storage for now)
let accessToken = "";

// ✅ Connect to MongoDB for Fuzzy Search
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Mongoose Schema for Storing Anime Data
const AnimeSchema = new mongoose.Schema({
  mal_id: { type: Number, unique: true },
  title: String,
  title_romanji: String,
  title_english: String,
  synonyms: [String],
  rating: String,
  total_episodes: String,
  cover_image: String,
});
const Anime = mongoose.model("Anime", AnimeSchema);

// ✅ Fetch Data (Limited to 24 Items)
const fetchFilteredAnimeData = async (url, res, errorMsg) => {
  try {
    const { data } = await axios.get(`${url}&limit=24`);
    const filteredData = data.data.slice(0, 24).map((anime) => ({
      mal_id: anime.mal_id,
      title: anime.title,
      title_romanji: anime.title_romanji || "Unknown",
      title_english: anime.title_english || "Unknown",
      rating: anime.rating,
      total_episodes: anime.episodes || "Unknown",
      cover_image: anime.images?.jpg?.large_image_url || null,
    }));
    res.json(filteredData);
  } catch (error) {
    console.error(`❌ ${errorMsg}:`, error.message);
    res.status(500).json({ error: errorMsg });
  }
};

// ✅ /meta/ Endpoints (Limited to 24 Results)
app.get("/meta/top-airing", (req, res) =>
  fetchFilteredAnimeData(
    "https://api.jikan.moe/v4/top/anime?filter=airing",
    res,
    "Failed to fetch top airing anime."
  )
);
app.get("/meta/popular", (req, res) =>
  fetchFilteredAnimeData(
    "https://api.jikan.moe/v4/top/anime?filter=bypopularity",
    res,
    "Failed to fetch popular anime."
  )
);
app.get("/meta/top-tv", (req, res) =>
  fetchFilteredAnimeData(
    "https://api.jikan.moe/v4/top/anime?type=tv",
    res,
    "Failed to fetch top TV anime."
  )
);
app.get("/meta/top-movies", (req, res) =>
  fetchFilteredAnimeData(
    "https://api.jikan.moe/v4/top/anime?type=movie",
    res,
    "Failed to fetch top movies."
  )
);
app.get("/meta/new-releases", (req, res) =>
  fetchFilteredAnimeData(
    "https://api.jikan.moe/v4/seasons/now",
    res,
    "Failed to fetch new releases."
  )
);

// ✅ /meta/banners (Limited to 15 Results)
app.get("/meta/banners", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.jikan.moe/v4/top/anime?filter=airing&limit=15"
    );
    const banners = data.data.slice(0, 15).map((anime) => ({
      mal_id: anime.mal_id,
      title: anime.title,
      title_romanji: anime.title_romanji || "Unknown",
      title_english: anime.title_english || "Unknown",
      total_episodes: anime.episodes || "Unknown",
      cover_image: anime.images?.jpg?.large_image_url || null,
    }));
    res.json(banners);
  } catch (error) {
    console.error("❌ Failed to fetch banners:", error.message);
    res.status(500).json({ error: "Failed to fetch banners." });
  }
});

// ✅ Fetch Anime Schedule (Requires OAuth)
app.get("/meta/schedule", async (req, res) => {
  if (!accessToken) {
    return res
      .status(400)
      .json({ error: "OAuth token is missing. Please authenticate first." });
  }

  try {
    const { data } = await axios.get(
      "https://api.animeschedule.net/v1/schedule",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    res.json(data);
  } catch (error) {
    console.error("❌ Failed to fetch anime schedule:", error.message);
    res.status(500).json({ error: "Failed to fetch anime schedule." });
  }
});

// ✅ Step 1: OAuth Authentication
app.get("/auth", (req, res) => {
  const authUrl = `https://animeschedule.net/api/v3/oauth2/authorize?${querystring.stringify(
    {
      client_id: process.env.CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      response_type: "token",
      scope: "read",
    }
  )}`;
  res.redirect(authUrl);
});

// ✅ /search (Fuzzy Search)
app.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query)
      return res.status(400).json({ error: "Query is required" });

    console.log(`🔎 Searching for: ${query}`);
    const { data } = await axios.get(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10`
    );

    const animeList = data.data.map((anime) => ({
      mal_id: anime.mal_id,
      title: anime.title,
      title_romanji: anime.title_romanji || "Unknown",
      title_english: anime.title_english || "Unknown",
      rating: anime.rating,
      total_episodes: anime.episodes || "Unknown",
      cover_image: anime.images?.jpg?.large_image_url || null,
    }));

    res.json(animeList);
  } catch (error) {
    console.error("❌ Search Error:", error.message);
    res.status(500).json({ error: "Search failed." });
  }
});

// ✅ /anime/:id (Fetch Anime Details)
app.get("/anime/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.get(`https://api.jikan.moe/v4/anime/${id}`);

    const animeDetails = {
      mal_id: data.data.mal_id,
      title: data.data.title,
      title_romanji: data.data.title_romanji || "Unknown",
      title_english: data.data.title_english || "Unknown",
      description: data.data.synopsis || "No description available",
      genres: data.data.genres || [],
      rating: data.data.rating || "Unknown",
      total_episodes: data.data.episodes || "Unknown",
      episode_duration: data.data.duration || "Unknown",
      cover_image: data.data.images?.jpg?.large_image_url || null,
    };

    res.json(animeDetails);
  } catch (error) {
    console.error("❌ Failed to fetch anime details:", error.message);
    res.status(500).json({ error: "Failed to fetch anime details." });
  }
});

// ✅ Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
