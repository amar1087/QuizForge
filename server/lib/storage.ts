import { randomUUID } from 'crypto';

// Simplified file storage for demo purposes
// This will be replaced with real storage when we add backend services

export async function putBufferAsFile(
  path: string, 
  buffer: Buffer, 
  bucket: 'audio' | 'previews'
): Promise<string> {
  // Mock implementation - just return the path for now
  console.log(`Mock: Uploading ${buffer.length} bytes to ${bucket}/${path}`);
  return path;
}

export async function signedUrl(
  path: string, 
  bucket: 'audio' | 'previews', 
  expiresSec = 600
): Promise<string> {
  // Mock implementation - return a mock URL
  return `/api/mock-files/${bucket}/${path}`;
}

export async function getFileBuffer(path: string, bucket: 'audio' | 'previews'): Promise<Buffer> {
  // Mock implementation - return empty buffer for now
  console.log(`Mock: Downloading file from ${bucket}/${path}`);
  return Buffer.alloc(0);
}

export function generateStoragePath(jobId: string, type: 'full' | 'preview'): string {
  const timestamp = Date.now();
  const uuid = randomUUID();
  return `${type}/${jobId}_${timestamp}_${uuid}.mp3`;
}
