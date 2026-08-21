import { Redis } from "ioredis";

const config = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

// Main: for HSET/HGETALL/LPUSH
export const redis = new Redis({
  ...config,
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Subscriber: for listening to worker events (SSE to browser)
export const redisSub = new Redis(config);

export const redisPub = new Redis(config);
