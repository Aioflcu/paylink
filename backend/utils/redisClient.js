const { createClient } = require('redis');

let client;

async function connectRedis() {
  if (client && client.isOpen) return client;

  const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
  client = createClient({ url });

  client.on('error', (err) => console.error('Redis Client Error', err));

  // retry logic with small backoff
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.connect();
      console.log('Connected to Redis');
      return client;
    } catch (err) {
      console.error(`Redis connect attempt ${attempt} failed:`, err.message || err);
      if (attempt === maxAttempts) throw err;
      // exponential backoff
      await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
    }
  }
}

function getRedisClient() {
  if (!client) {
    // create a client object that is not connected yet
    const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
    client = createClient({ url });
    client.on('error', (err) => console.error('Redis Client Error', err));
  }
  return client;
}

async function disconnectRedis() {
  if (client && client.isOpen) {
    try {
      await client.quit();
      console.log('Redis client disconnected');
    } catch (err) {
      console.warn('Error during redis disconnect:', err.message || err);
    }
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis
};
