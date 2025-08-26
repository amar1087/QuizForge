import { useEffect, useState } from 'react';
import { useQuizStore } from '@/stores/quizStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AudioPlayer } from './AudioPlayer';
import { PurchaseModal } from './PurchaseModal';
import { apiRequest } from '@/lib/queryClient';
import type { Job } from '@shared/schema';

interface GenerationProgress {
  step: string;
  progress: number;
  completed: boolean;
}

export function GenerateStep() {
  const {
    teamName,
    opponentTeamName,
    yourRoster,
    opponentRoster,
    genre,
    tone,
    persona,
    ratingMode,
    clientId,
    jobId,
    jobStatus,
    isGenerating,
    previewUrl,
    lyrics,
    errorMessage,
    isPurchased,
    fullSongUrl,
    setJobId,
    setJobStatus,
    setGenerating,
    setPreviewUrl,
    setLyrics,
    setError,
    reset
  } = useQuizStore();

  const { toast } = useToast();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress[]>([
    { step: 'Analyzing Rosters', progress: 0, completed: false },
    { step: 'Writing Lyrics', progress: 0, completed: false },
    { step: 'Composing Music', progress: 0, completed: false }
  ]);

  // Start generation when component mounts
  useEffect(() => {
    if (!jobId && !isGenerating && yourRoster && opponentRoster) {
      startGeneration();
    }
  }, []);

  // Poll job status
  useEffect(() => {
    if (jobId && jobStatus !== 'succeeded' && jobStatus !== 'failed') {
      const pollInterval = setInterval(async () => {
        try {
          const response = await apiRequest('GET', `/api/jobs/${jobId}`);
          const job: Job = await response.json();
          
          setJobStatus(job.status);
          
          if (job.status === 'succeeded') {
            if (job.previewMp3Path) {
              setPreviewUrl(`/api/preview?jobId=${jobId}`);
            }
            if (job.lyrics) {
              setLyrics(job.lyrics);
            }
            setGenerating(false);
            clearInterval(pollInterval);
          } else if (job.status === 'failed') {
            setError(job.errorMessage || 'Song generation failed');
            setGenerating(false);
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error('Failed to poll job status:', error);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [jobId, jobStatus]);

  // Simulate progress updates
  useEffect(() => {
    if (isGenerating) {
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          const updated = [...prev];
          
          // Update progress for each step
          for (let i = 0; i < updated.length; i++) {
            if (!updated[i].completed) {
              if (updated[i].progress < 100) {
                updated[i].progress = Math.min(100, updated[i].progress + Math.random() * 15);
              } else {
                updated[i].completed = true;
                break;
              }
            }
          }
          
          return updated;
        });
      }, 500);

      return () => clearInterval(progressInterval);
    }
  }, [isGenerating]);

  const startGeneration = async () => {
    if (!yourRoster || !opponentRoster) {
      toast({
        title: "Missing Roster Data",
        description: "Please go back and upload roster screenshots",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/jobs', {
        teamName,
        opponentTeamName,
        yourRosterRaw: yourRoster,
        opponentRosterRaw: opponentRoster,
        genre,
        tone,
        persona,
        ratingMode,
        clientId
      });

      const { jobId: newJobId } = await response.json();
      setJobId(newJobId);
      setJobStatus('queued');
    } catch (error) {
      console.error('Failed to create job:', error);
      setError('Failed to start song generation');
      setGenerating(false);
      toast({
        title: "Generation Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePurchase = () => {
    setShowPurchaseModal(true);
  };

  const handleRegenerateClick = () => {
    reset();
  };

  const renderGenerationProgress = () => (
    <div className="space-y-6 mb-8">
      {generationProgress.map((item, index) => (
        <Card key={index} className="glass-card rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${item.completed ? 'text-green-400' : item.progress > 0 ? 'text-primary' : 'text-slate-400'}`}>
                <i className={`fas ${item.completed ? 'fa-check-circle' : item.progress > 0 ? 'fa-clock' : 'fa-circle'} mr-2`}></i>
                {item.step}
              </span>
              <span className="text-sm text-slate-400">{Math.round(item.progress)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${item.completed ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      {/* Audio Player */}
      <Card className="glass-card rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">
              <i className="fas fa-play-circle mr-2 text-primary"></i>15-Second Preview
            </h3>
            <div className="text-sm text-slate-400">Full song: 2:43</div>
          </div>
          
          {previewUrl && <AudioPlayer src={previewUrl} />}
        </CardContent>
      </Card>

      {/* Lyrics Preview */}
      {lyrics && (
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">
              <i className="fas fa-scroll mr-2 text-secondary"></i>Lyrics Preview
            </h3>
            <div className="bg-black/20 rounded-xl p-4 font-mono text-sm leading-relaxed max-h-64 overflow-y-auto">
              <pre className="text-white whitespace-pre-wrap">{lyrics.substring(0, 400)}...</pre>
              <p className="text-slate-400 italic mt-4">...and much more in the full version!</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase CTA */}
      <div className="text-center">
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-2xl font-bold mb-2">Love Your Preview?</h3>
            <p className="text-slate-300 mb-4">Get the full 2:43 song with complete lyrics and high-quality audio</p>
            <div className="flex items-center justify-center space-x-6 mb-6">
              <div className="text-center">
                <i className="fas fa-download text-2xl text-primary mb-2"></i>
                <p className="text-sm">MP3 Download</p>
              </div>
              <div className="text-center">
                <i className="fas fa-file-alt text-2xl text-primary mb-2"></i>
                <p className="text-sm">Full Lyrics</p>
              </div>
              <div className="text-center">
                <i className="fas fa-share-alt text-2xl text-primary mb-2"></i>
                <p className="text-sm">Easy Sharing</p>
              </div>
            </div>
            <Button
              onClick={handlePurchase}
              className="bg-gradient-to-r from-gold to-yellow-500 px-8 py-4 rounded-2xl font-bold text-lg text-black hover:scale-105 transform transition-all duration-300 shadow-xl hover:bg-gradient-to-r hover:from-yellow-400 hover:to-gold"
              data-testid="button-purchase-full-song"
            >
              <i className="fas fa-star mr-2"></i>Get Full Song - $3.99
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      <div className="glass-card rounded-3xl p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 ${isGenerating ? 'animate-pulse-slow' : 'animate-float'}`}>
            <i className={`fas ${isGenerating ? 'fa-cog fa-spin' : jobStatus === 'succeeded' ? 'fa-check' : jobStatus === 'failed' ? 'fa-times' : 'fa-music'} text-3xl text-white`}></i>
          </div>
          <h2 className="text-3xl font-bold mb-3">
            {isGenerating ? 'Creating Your Anthem' : 
             jobStatus === 'succeeded' ? 'Your Anthem is Ready!' :
             jobStatus === 'failed' ? 'Generation Failed' : 'Anthem Complete'}
          </h2>
          <p className="text-slate-300">
            {isGenerating ? 'Generating personalized lyrics and composing your trash talk masterpiece...' :
             jobStatus === 'succeeded' ? 'Listen to your personalized trash talk anthem below' :
             jobStatus === 'failed' ? errorMessage || 'Something went wrong during generation' :
             'Your song has been generated successfully'}
          </p>
        </div>

        {/* Generation Progress */}
        {isGenerating && renderGenerationProgress()}

        {/* Error State */}
        {jobStatus === 'failed' && (
          <div className="text-center py-8">
            <Card className="glass-card rounded-2xl border-red-500/30">
              <CardContent className="p-6">
                <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <h3 className="text-xl font-semibold text-red-400 mb-2">Generation Failed</h3>
                <p className="text-slate-300 mb-4">{errorMessage || 'An error occurred during song generation'}</p>
                <Button
                  onClick={startGeneration}
                  className="bg-primary hover:bg-primary/80"
                  data-testid="button-retry-generation"
                >
                  <i className="fas fa-redo mr-2"></i>Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Section */}
        {jobStatus === 'succeeded' && renderPreview()}

        {/* Regenerate Button */}
        <div className="text-center mt-8">
          <Button
            onClick={handleRegenerateClick}
            variant="outline"
            className="glass-button px-6 py-3 rounded-xl text-sm hover:scale-105 transform transition-all"
            data-testid="button-regenerate"
          >
            <i className="fas fa-redo mr-2"></i>Generate Different Version
          </Button>
        </div>
      </div>

      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        jobId={jobId}
      />
    </>
  );
}
