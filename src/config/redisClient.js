// src/config/redisClient.js
import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redis = createClient({
  url: REDIS_URL,
});

redis.on("error", (err) => {
  console.error("❌ Redis Client Error", err);
});

export async function initRedis() {
  if (!redis.isOpen) {
    await redis.connect();
    console.log("✅ Redis connected");
  }
}

export default redis;
