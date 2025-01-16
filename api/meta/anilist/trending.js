const { GraphQLClient } = require('graphql-request');
const client = new GraphQLClient('https://graphql.anilist.co');

const trendingQuery = `
  query {
    Page(page: 1, perPage: 5) {
      media(sort: TRENDING_DESC) {
        id
        title {
          userPreferred
        }
        coverImage {
          medium
        }
      }
    }
  }
`;

export default async function handler(req, res) {
  try {
    const data = await client.request(trendingQuery);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending anime' });
  }
}
