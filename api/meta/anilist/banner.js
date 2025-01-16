const { GraphQLClient } = require('graphql-request');
const client = new GraphQLClient('https://graphql.anilist.co');

const trendingBannerQuery = `
  query {
    Page(page: 1, perPage: 5) {
      media(sort: TRENDING_DESC) {
        id
        title {
          userPreferred
        }
        bannerImage
      }
    }
  }
`;

export default async function handler(req, res) {
  try {
    const data = await client.request(trendingBannerQuery);
    const banners = data.Page.media.map((anime) => ({
      id: anime.id,
      title: anime.title.userPreferred,
      bannerImage: anime.bannerImage || 'No banner available',
    }));

    res.status(200).json({ trendingBanners: banners });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending anime banners' });
  }
}

