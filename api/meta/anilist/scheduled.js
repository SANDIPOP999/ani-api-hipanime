const { GraphQLClient } = require('graphql-request');
const client = new GraphQLClient('https://graphql.anilist.co');

const scheduledQuery = `
  query {
    Page(page: 1, perPage: 5) {
      media(type: ANIME, status: RELEASING) {
        id
        title {
          userPreferred
        }
        startDate {
          year
          month
          day
        }
      }
    }
  }
`;

export default async function handler(req, res) {
  try {
    const data = await client.request(scheduledQuery);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scheduled anime' });
  }
}
