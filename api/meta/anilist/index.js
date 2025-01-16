import axios from "axios";

const ANILIST_API_URL = "https://graphql.anilist.co";

export default async function handler(req, res) {
  const { method, query } = req;
  
  if (method === "GET") {
    const { pathname } = req.url;

    // Route: /meta/anilist/scheduled
    if (pathname === "/meta/anilist/scheduled") {
      try {
        const query = `
          query {
            Page(perPage: 10) {
              airingSchedules {
                media {
                  id
                  title {
                    romaji
                  }
                  nextAiringEpisode {
                    airingAt
                    episode
                  }
                }
              }
            }
          }
        `;

        const response = await axios.post(ANILIST_API_URL, { query }, {
          headers: { "Content-Type": "application/json" }
        });

        const scheduledAnime = response.data.data.Page.airingSchedules.map(schedule => ({
          title: schedule.media.title.romaji,
          episode: schedule.media.nextAiringEpisode.episode,
          airingAt: schedule.media.nextAiringEpisode.airingAt,
        }));

        res.status(200).json(scheduledAnime);
      } catch (error) {
        console.error("Error fetching scheduled anime:", error);
        res.status(500).json({ error: "Failed to fetch scheduled anime." });
      }
    }

    // Route: /meta/anilist/trending
    else if (pathname === "/meta/anilist/trending") {
      try {
        const query = `
          query {
            MediaTrend(sort: TRENDING_DESC, type: ANIME, perPage: 10) {
              media {
                id
                title {
                  romaji
                }
                coverImage {
                  large
                }
              }
            }
          }
        `;

        const response = await axios.post(ANILIST_API_URL, { query }, {
          headers: { "Content-Type": "application/json" }
        });

        const trendingAnime = response.data.data.MediaTrend.map(item => ({
          title: item.media.title.romaji,
          coverImage: item.media.coverImage.large,
        }));

        res.status(200).json(trendingAnime);
      } catch (error) {
        console.error("Error fetching trending anime:", error);
        res.status(500).json({ error: "Failed to fetch trending anime." });
      }
    }

    // Route: /meta/anilist/banner
    else if (pathname === "/meta/anilist/banner") {
      try {
        const query = `
          query {
            Page(perPage: 5) {
              media(type: ANIME, sort: TRENDING_DESC) {
                bannerImage
              }
            }
          }
        `;

        const response = await axios.post(ANILIST_API_URL, { query }, {
          headers: { "Content-Type": "application/json" }
        });

        const banners = response.data.data.Page.media.map(item => item.bannerImage);

        res.status(200).json(banners);
      } catch (error) {
        console.error("Error fetching anime banners:", error);
        res.status(500).json({ error: "Failed to fetch anime banners." });
      }
    }

    // Route: /meta/anilist/info
    else if (pathname.startsWith("/meta/anilist/info")) {
      const { id } = query;

      if (!id) {
        return res.status(400).json({ error: "Anime ID is required." });
      }

      try {
        const query = `
          query ($id: Int) {
            Media(id: $id) {
              id
              title {
                romaji
              }
              description
              coverImage {
                large
              }
            }
          }
        `;

        const response = await axios.post(ANILIST_API_URL, {
          query,
          variables: { id: parseInt(id) }
        }, {
          headers: { "Content-Type": "application/json" }
        });

        const animeInfo = {
          title: response.data.data.Media.title.romaji,
          description: response.data.data.Media.description,
          coverImage: response.data.data.Media.coverImage.large,
        };

        res.status(200).json(animeInfo);
      } catch (error) {
        console.error("Error fetching anime info:", error);
        res.status(500).json({ error: "Failed to fetch anime info." });
      }
    }

    // Invalid route
    else {
      res.status(404).json({ error: "Not Found" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
