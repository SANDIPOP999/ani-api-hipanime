const fetch = require('node-fetch');

async function fetchAnilistData(query) {
  const url = "https://graphql.anilist.co";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query }),
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`AniList API Error: ${error.message}`);
  }
  return res.json();
}

module.exports = async (req, res) => {
  const { type } = req.query;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let query;
    switch (type) {
      case "trending":
        query = `
          query {
            Page {
              media(type: ANIME, sort: TRENDING_DESC) {
                id
                title {
                  romaji
                  english
                }
                coverImage {
                  large
                }
              }
            }
          }
        `;
        break;
      case "search":
        const { query: searchQuery } = req.body;
        if (!searchQuery) {
          return res.status(400).json({ error: "Search query is required" });
        }
        query = `
          query {
            Page(page: 1, perPage: 10) {
              media(search: "${searchQuery}") {
                id
                title {
                  romaji
                  english
                }
                coverImage {
                  large
                }
              }
            }
          }
        `;
        break;
      case "info":
        const { id } = req.query;
        if (!id || isNaN(id)) {
          return res.status(400).json({ error: "Valid Anime ID is required" });
        }
        query = `
          query {
            Media(id: ${id}) {
              id
              title {
                romaji
                english
              }
              type
              format
              status
              episodes
              season
              seasonYear
              startDate {
                year
                month
                day
              }
              endDate {
                year
                month
                day
              }
              genres
              description
              duration
              averageScore
              coverImage {
                extraLarge
                large
                medium
              }
            }
          }
        `;
        break;
      default:
        return res.status(400).json({ error: "Invalid endpoint type" });
    }

    const data = await fetchAnilistData(query);

    if (type === "trending") {
      return res.status(200).json(data.data.Page.media);
    } else if (type === "search") {
      return res.status(200).json(data.data.Page.media);
    } else if (type === "info") {
      return res.status(200).json(data.data.Media);
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
