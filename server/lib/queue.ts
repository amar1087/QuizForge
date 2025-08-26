import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: 3,
});

export const songQueue = new Queue('song-generate', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      settings: {
        delay: 5000, // 5 seconds initial delay
      },
    },
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export interface SongJobData {
  jobId: string;
  teamName: string;
  opponentTeamName: string;
  yourRosterRaw: any;
  opponentRosterRaw: any;
  genre: string;
  tone: string;
  persona: string;
  ratingMode: string;
  inputHash: string;
}

export async function enqueueSongGeneration(data: SongJobData) {
  return await songQueue.add('generate-song', data, {
    priority: 1,
    delay: 0,
  });
}

// Health check
export async function checkQueueHealth() {
  try {
    await redis.ping();
    return { healthy: true, redis: 'connected' };
  } catch (error) {
    return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
