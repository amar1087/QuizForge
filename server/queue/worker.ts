import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { storage } from '../storage';
import { generateLyrics, filterContent } from '../lib/lyrics';
import { generateSong, pollSong } from '../lib/suno';
import { putBufferAsFile, generateStoragePath } from '../lib/storage';
import { buildNaiveLRC } from '../lib/lrc';
import { normalizeInputs } from '../lib/normalize';
import type { Job as JobRecord } from '@shared/schema';

const redis = new Redis(process.env.UPSTASH_REDIS_URL!);

interface JobData {
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

async function createPreview(fullMp3Buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const inputFile = `/tmp/input_${randomUUID()}.mp3`;
    const outputFile = `/tmp/output_${randomUUID()}.mp3`;
    
    try {
      // Write input file
      writeFileSync(inputFile, fullMp3Buffer);
      
      // Use ffmpeg to create 15-second preview with fade
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputFile,
        '-t', '15',           // 15 seconds
        '-af', 'afade=in:st=0:d=0.2,afade=out:st=14.8:d=0.2', // Fade in/out
        '-y',                 // Overwrite output
        outputFile
      ]);
      
      ffmpeg.on('close', (code) => {
        try {
          if (code === 0) {
            const previewBuffer = require('fs').readFileSync(outputFile);
            resolve(previewBuffer);
          } else {
            reject(new Error(`FFmpeg failed with code ${code}`));
          }
        } catch (error) {
          reject(error);
        } finally {
          // Cleanup
          try {
            unlinkSync(inputFile);
            unlinkSync(outputFile);
          } catch {}
        }
      });
      
      ffmpeg.on('error', (error) => {
        reject(error);
        try {
          unlinkSync(inputFile);
          unlinkSync(outputFile);
        } catch {}
      });
    } catch (error) {
      reject(error);
    }
  });
}

const worker = new Worker('song-generate', async (job: Job<JobData>) => {
  const { jobId, teamName, opponentTeamName, yourRosterRaw, opponentRosterRaw, 
          genre, tone, persona, ratingMode, inputHash } = job.data;
  
  try {
    // Update job status
    await storage.updateJobStatus(jobId, 'processing');
    
    // Check for existing successful job with same hash
    const existingJob = await storage.getJobByHash(inputHash);
    if (existingJob && existingJob.status === 'succeeded' && existingJob.mp3Path) {
      console.log('Found existing successful job, reusing assets');
      
      await storage.updateJob(jobId, {
        status: 'succeeded',
        lyrics: existingJob.lyrics,
        lyricsLrc: existingJob.lyricsLrc,
        mp3Path: existingJob.mp3Path,
        previewMp3Path: existingJob.previewMp3Path,
        durationSec: existingJob.durationSec,
        sunoRequestId: existingJob.sunoRequestId
      });
      
      return;
    }
    
    // Normalize inputs
    const { normalized } = normalizeInputs({
      teamName,
      opponentTeamName,
      yourRosterRaw,
      opponentRosterRaw,
      genre: genre as any,
      tone: tone as any,
      persona: persona as any,
      ratingMode: ratingMode as any
    });
    
    // Generate lyrics
    const rawLyrics = generateLyrics({
      teamName: normalized.teamName,
      opponentTeamName: normalized.opponentTeamName,
      yourRoster: normalized.yourRoster,
      opponentRoster: normalized.opponentRoster,
      genre: normalized.genre,
      tone: normalized.tone,
      persona: normalized.persona,
      ratingMode: normalized.ratingMode
    });
    
    const lyrics = filterContent(rawLyrics, normalized.ratingMode);
    
    // Generate song with Suno
    const sunoResult = await generateSong({
      lyrics,
      genre: normalized.genre,
      persona: normalized.persona,
      tone: normalized.tone,
      ratingMode: normalized.ratingMode
    });
    
    await storage.updateJob(jobId, {
      lyrics,
      sunoRequestId: sunoResult.requestId
    });
    
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      const pollResult = await pollSong(sunoResult.requestId);
      
      if (pollResult.status === 'succeeded' && pollResult.mp3Buffer) {
        const fullMp3Buffer = Buffer.from(pollResult.mp3Buffer);
        const durationSec = pollResult.durationSec || 45;
        
        // Store full MP3
        const fullPath = generateStoragePath(jobId, 'full');
        await putBufferAsFile(fullPath, fullMp3Buffer, 'audio');
        
        // Create and store preview
        const previewBuffer = await createPreview(fullMp3Buffer);
        const previewPath = generateStoragePath(jobId, 'preview');
        await putBufferAsFile(previewPath, previewBuffer, 'previews');
        
        // Generate LRC
        const lyricsLrc = buildNaiveLRC(lyrics, durationSec);
        
        // Update job with success
        await storage.updateJob(jobId, {
          status: 'succeeded',
          mp3Path: fullPath,
          previewMp3Path: previewPath,
          lyricsLrc,
          durationSec
        });
        
        return;
      } else if (pollResult.status === 'failed') {
        throw new Error(pollResult.error || 'Song generation failed');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    throw new Error('Song generation timed out');
    
  } catch (error) {
    console.error('Job processing failed:', error);
    
    await storage.updateJob(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}, {
  connection: redis,
  concurrency: 3,
  removeOnComplete: 10,
  removeOnFail: 50,
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log('Song generation worker started');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  await redis.quit();
  process.exit(0);
});
