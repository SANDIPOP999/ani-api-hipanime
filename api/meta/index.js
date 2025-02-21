const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID; // Add this in your .env file

const MAL_API_BASE = "https://api.myanimelist.net/v2/anime";

// Function to fetch data from MAL API
const fetchMAL = async (url, params = {}) => {
    try {
        const response = await axios.get(url, {
            headers: { "X-MAL-CLIENT-ID": MAL_CLIENT_ID },
            params,
        });
        return response.data;
    } catch (error) {
        console.error("MAL API Error:", error.response?.data || error.message);
        return null;
    }
};

// 📌 **1. Anime Search**
app.get("/search", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing 'q' parameter" });

    const data = await fetchMAL(`${MAL_API_BASE}`, { q: query, limit: 10 });
    res.json(data || { error: "Failed to fetch search results" });
});

// 📌 **2. Anime Details**
app.get("/anime/:id", async (req, res) => {
    const animeId = req.params.id;
    const fields = "id,title,synopsis,mean,genres,num_episodes,start_date,end_date,studios,main_picture,related_anime";
    const data = await fetchMAL(`${MAL_API_BASE}/${animeId}`, { fields });
    res.json(data || { error: "Anime not found" });
});

// 📌 **3. Top Airing Anime**
app.get("/top-airing", async (req, res) => {
    const data = await fetchMAL(`${MAL_API_BASE}/ranking`, { ranking_type: "airing", limit: 10 });
    res.json(data || { error: "Failed to fetch top airing anime" });
});

// 📌 **4. Recent Anime (New Releases)**
app.get("/recent-anime", async (req, res) => {
    const data = await fetchMAL(`${MAL_API_BASE}`, { sort: "start_date", limit: 10 });
    res.json(data || { error: "Failed to fetch recent anime" });
});

// 📌 **5. Banner Anime (Popular picks)**
app.get("/banners", async (req, res) => {
    const data = await fetchMAL(`${MAL_API_BASE}/ranking`, { ranking_type: "all", limit: 5 });
    res.json(data || { error: "Failed to fetch banner anime" });
});

// 📌 **6. Subbed & Dubbed Anime Filtering (Workaround)**
app.get("/subbed-anime", async (req, res) => {
    const data = await fetchMAL(`${MAL_API_BASE}`, { q: "English", limit: 10 });
    res.json(data || { error: "Failed to fetch subbed anime" });
});

app.get("/dubbed-anime", async (req, res) => {
    const data = await fetchMAL(`${MAL_API_BASE}`, { q: "Dub", limit: 10 });
    res.json(data || { error: "Failed to fetch dubbed anime" });
});

// Start server
app.listen(PORT, () => console.log(`MAL API running on port ${PORT}`));
