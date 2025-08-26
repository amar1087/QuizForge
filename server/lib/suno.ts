export type SunoGenerateParams = {
  lyrics: string;
  genre: 'country'|'rap'|'electronic'|'pop'|'blues'|'funk'|'rnb'|'gospel';
  persona: 'first_person'|'narrator';
  tone: 'mild'|'medium'|'savage';
  ratingMode: 'PG'|'NSFW';
  durationSec?: number;
};

export type SunoGenerateResult = {
  requestId: string;
};

export type SunoPollResult = {
  status: 'queued'|'processing'|'succeeded'|'failed';
  mp3Buffer?: ArrayBuffer;
  durationSec?: number;
  lyrics?: string;
  error?: string;
};

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const DEV_MOCK_SUNO = process.env.DEV_MOCK_SUNO === '1';

export async function generateSong(params: SunoGenerateParams): Promise<SunoGenerateResult> {
  if (DEV_MOCK_SUNO || !SUNO_API_KEY) {
    // Mock mode for development
    console.log('Using mock Suno API for development');
    return { requestId: 'mock_' + crypto.randomUUID() };
  }

  try {
    // TODO: Call Suno API with headers { Authorization: Bearer SUNO_API_KEY }
    // Submit lyrics + style tokens derived from genre/tone/persona.
    const response = await fetch('https://api.suno.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lyrics: params.lyrics,
        style: `${params.genre} ${params.tone} ${params.persona}`,
        duration: params.durationSec || 45,
        rating: params.ratingMode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Suno API error: ${response.status}`);
    }

    const data = await response.json();
    return { requestId: data.id || 'unknown' };
  } catch (error) {
    console.error('Suno API error:', error);
    // Fallback to mock mode on API failure
    return { requestId: 'mock_' + crypto.randomUUID() };
  }
}

export async function pollSong(requestId: string): Promise<SunoPollResult> {
  if (requestId.startsWith('mock_') || DEV_MOCK_SUNO || !SUNO_API_KEY) {
    // Mock mode - simulate successful generation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate a simple mock MP3 buffer (silence)
        const mockBuffer = new ArrayBuffer(1024);
        resolve({
          status: 'succeeded',
          mp3Buffer: mockBuffer,
          durationSec: 45,
          lyrics: 'Mock lyrics generated for development'
        });
      }, 1000);
    });
  }

  try {
    // TODO: Poll Suno job until complete
    const response = await fetch(`https://api.suno.ai/v1/jobs/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Suno poll error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'succeeded' && data.audio_url) {
      // Download the MP3
      const audioResponse = await fetch(data.audio_url);
      const mp3Buffer = await audioResponse.arrayBuffer();
      
      return {
        status: 'succeeded',
        mp3Buffer,
        durationSec: data.duration || 45,
        lyrics: data.lyrics
      };
    }

    return {
      status: data.status || 'queued',
      error: data.error
    };
  } catch (error) {
    console.error('Suno poll error:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
