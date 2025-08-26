import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Genre, Tone, Persona, RatingMode, VocalGender, PlayerRoster, JobStatus } from '@shared/schema';

interface QuizState {
  // Current step (1-4: Upload, Rosters, Style, Email)
  currentStep: number;
  
  // Step 1: Team names
  teamName: string;
  opponentTeamName: string;
  
  // Step 2: Rosters
  yourRosterImage: File | null;
  opponentRosterImage: File | null;
  yourRoster: PlayerRoster | null;
  opponentRoster: PlayerRoster | null;
  isProcessingOCR: boolean;
  
  // Step 3: Style selection
  genre: Genre;
  tone: Tone;
  persona: Persona;
  ratingMode: RatingMode;
  vocalGender: VocalGender;
  
  // Step 4: Generation & Preview
  isGenerating: boolean;
  generationProgress: number;
  previewUrl: string | null;
  isPreviewPlaying: boolean;
  
  // Backend job tracking
  jobId: string | null;
  jobStatus: JobStatus | null;
  lyrics: string | null;
  errorMessage: string | null;
  
  // Purchase
  isPurchased: boolean;
  fullSongUrl: string | null;
  
  // Client ID for guest sessions
  clientId: string;
}

interface QuizActions {
  nextStep: () => void;
  prevStep: () => void;
  setTeamNames: (teamName: string, opponentTeamName: string) => void;
  setRosterImage: (type: 'your' | 'opponent', file: File) => void;
  setRoster: (type: 'your' | 'opponent', roster: PlayerRoster) => void;
  setOCRProcessing: (processing: boolean) => void;
  setStyle: (style: Partial<Pick<QuizState, 'genre' | 'tone' | 'persona' | 'ratingMode' | 'vocalGender'>>) => void;
  startGeneration: () => void;
  setGenerationProgress: (progress: number) => void;
  setPreviewUrl: (url: string) => void;
  setPreviewPlaying: (playing: boolean) => void;
  setJobId: (jobId: string) => void;
  setJobStatus: (status: JobStatus) => void;
  setLyrics: (lyrics: string) => void;
  setError: (error: string | null) => void;
  setPurchased: (purchased: boolean) => void;
  setFullSongUrl: (url: string) => void;
  reset: () => void;
  canProceedToStep: (step: number) => boolean;
}

// Generate client ID for guest sessions
const generateClientId = () => {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const initialState: QuizState = {
  currentStep: 1,
  teamName: '',
  opponentTeamName: '',
  yourRosterImage: null,
  opponentRosterImage: null,
  yourRoster: null,
  opponentRoster: null,
  isProcessingOCR: false,
  genre: 'rap',
  tone: 'medium',
  persona: 'first_person',
  ratingMode: 'PG',
  vocalGender: 'male',
  isGenerating: false,
  generationProgress: 0,
  previewUrl: null,
  isPreviewPlaying: false,
  jobId: null,
  jobStatus: null,
  lyrics: null,
  errorMessage: null,
  isPurchased: false,
  fullSongUrl: null,
  clientId: generateClientId(),
};

export const useQuizStore = create<QuizState & QuizActions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      nextStep: () => {
        const { currentStep, canProceedToStep } = get();
        const nextStep = currentStep + 1;
        if (nextStep <= 4 && canProceedToStep(nextStep)) {
          set({ currentStep: nextStep });
        }
      },
      
      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },
      
      setTeamNames: (teamName, opponentTeamName) => {
        set({ teamName, opponentTeamName });
      },
      
      setRosterImage: (type, file) => {
        if (type === 'your') {
          set({ yourRosterImage: file });
        } else {
          set({ opponentRosterImage: file });
        }
      },
      
      setRoster: (type, roster) => {
        if (type === 'your') {
          set({ yourRoster: roster });
        } else {
          set({ opponentRoster: roster });
        }
      },
      
      setOCRProcessing: (processing) => {
        set({ isProcessingOCR: processing });
      },
      
      setStyle: (style) => {
        set(style);
      },
      
      startGeneration: () => {
        set({ isGenerating: true, generationProgress: 0, currentStep: 4 });
      },
      
      setGenerationProgress: (progress) => {
        set({ generationProgress: progress });
      },
      
      setPreviewPlaying: (playing) => {
        set({ isPreviewPlaying: playing });
      },
      
      setJobId: (jobId) => {
        set({ jobId });
      },
      
      setJobStatus: (status) => {
        set({ jobStatus: status });
      },
      

      
      setPreviewUrl: (url) => {
        set({ previewUrl: url, isGenerating: false });
      },
      
      setLyrics: (lyrics) => {
        set({ lyrics });
      },
      
      setError: (error) => {
        set({ errorMessage: error });
      },
      
      setPurchased: (purchased) => {
        set({ isPurchased: purchased });
      },
      
      setFullSongUrl: (url) => {
        set({ fullSongUrl: url });
      },
      
      reset: () => {
        set({ ...initialState, clientId: generateClientId() });
      },
      
      canProceedToStep: (step) => {
        const state = get();
        switch (step) {
          case 1:
            return true;
          case 2:
            return state.teamName.length > 0 && state.opponentTeamName.length > 0;
          case 3:
            return state.yourRoster !== null && state.opponentRoster !== null;
          case 4:
            return true; // Style selection is always valid with defaults
          default:
            return false;
        }
      },
    }),
    { name: 'quiz-store' }
  )
);
