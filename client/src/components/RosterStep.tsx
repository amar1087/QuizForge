import { useRef, useState } from 'react';
import { useQuizStore } from '@/stores/quizStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { processRosterImage, mockOCRProcess } from '@/lib/ocr';
import type { PlayerRoster } from '@shared/schema';

export function RosterStep() {
  const {
    yourRosterImage,
    opponentRosterImage,
    yourRoster,
    opponentRoster,
    isProcessingOCR,
    setRosterImage,
    setRoster,
    setOCRProcessing,
    nextStep,
    canProceedToStep
  } = useQuizStore();

  const { toast } = useToast();
  const yourFileRef = useRef<HTMLInputElement>(null);
  const opponentFileRef = useRef<HTMLInputElement>(null);

  const [editingRoster, setEditingRoster] = useState<'your' | 'opponent' | null>(null);
  const [editedRoster, setEditedRoster] = useState<PlayerRoster | null>(null);

  const handleFileUpload = async (file: File, type: 'your' | 'opponent') => {
    setRosterImage(type, file);
    setOCRProcessing(true);

    try {
      // Use mock OCR for development
      const result = await mockOCRProcess(file, type === 'opponent');
      
      if (result.roster) {
        setRoster(type, result.roster);
        toast({
          title: "OCR Processing Complete",
          description: `Successfully detected ${type === 'your' ? 'your' : 'opponent'} roster players`,
        });
      } else {
        toast({
          title: "OCR Processing Failed",
          description: "Please try again with a clearer image",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Processing Image",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setOCRProcessing(false);
    }
  };

  const startEditing = (type: 'your' | 'opponent') => {
    const roster = type === 'your' ? yourRoster : opponentRoster;
    if (roster) {
      setEditingRoster(type);
      setEditedRoster({ ...roster });
    }
  };

  const saveEdits = () => {
    if (editingRoster && editedRoster) {
      setRoster(editingRoster, editedRoster);
      setEditingRoster(null);
      setEditedRoster(null);
    }
  };

  const cancelEdits = () => {
    setEditingRoster(null);
    setEditedRoster(null);
  };

  const canProceed = canProceedToStep(3);

  const RosterDisplay = ({ roster, type, isEditing }: { 
    roster: PlayerRoster; 
    type: 'your' | 'opponent';
    isEditing: boolean;
  }) => {
    const positions = ['QB', 'RB', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DEF'] as const;
    const borderColor = type === 'your' ? 'border-green-500/30' : 'border-orange-500/30';
    const iconColor = type === 'your' ? 'text-green-500' : 'text-orange-500';
    const titleColor = type === 'your' ? 'text-green-400' : 'text-orange-400';

    return (
      <Card className={`glass-card rounded-xl p-4 border ${borderColor}`}>
        <CardContent className="p-0">
          <div className="flex items-center mb-3">
            <i className={`fas fa-check-circle ${iconColor} mr-2`}></i>
            <span className={`font-semibold ${titleColor}`}>OCR Processing Complete</span>
          </div>
          {isEditing && editedRoster ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {positions.map((position) => (
                  <div key={position}>
                    <Label className="text-xs text-slate-400">{position}</Label>
                    <Input
                      value={editedRoster[position]}
                      onChange={(e) => setEditedRoster({
                        ...editedRoster,
                        [position]: e.target.value
                      })}
                      className="text-sm bg-white/10 border-white/20"
                    />
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <Button onClick={saveEdits} size="sm" className="bg-primary">
                  Save
                </Button>
                <Button onClick={cancelEdits} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                {positions.map((position) => (
                  <div key={position} className="bg-white/5 rounded-lg p-2">
                    <span className="text-slate-400 text-xs">{position}:</span> {roster[position]}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => startEditing(type)}
                variant="ghost"
                size="sm"
                className={`${type === 'your' ? 'text-primary hover:text-primary' : 'text-secondary hover:text-secondary'} text-sm`}
              >
                <i className="fas fa-edit mr-1"></i>Edit Names
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="glass-card rounded-3xl p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
          <i className="fas fa-camera text-3xl text-white"></i>
        </div>
        <h2 className="text-3xl font-bold mb-3">Upload Your Roster Screenshots</h2>
        <p className="text-slate-300">Upload screenshots of both team rosters - we'll automatically detect player names using OCR</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Your Roster */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary">
            <i className="fas fa-upload mr-2"></i>Your Team Roster
          </h3>
          <div 
            className="upload-zone rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 hover:border-primary"
            onClick={() => yourFileRef.current?.click()}
          >
            <input
              ref={yourFileRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'your');
              }}
              data-testid="input-your-roster"
            />
            <i className="fas fa-cloud-upload-alt text-4xl text-primary mb-4 animate-bounce-slow"></i>
            <p className="font-semibold mb-2">Drop your roster screenshot here</p>
            <p className="text-sm text-slate-400">or click to browse files</p>
            <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 10MB</p>
          </div>
          
          {yourRoster && (
            <RosterDisplay 
              roster={yourRoster} 
              type="your" 
              isEditing={editingRoster === 'your'}
            />
          )}
        </div>

        {/* Opponent Roster */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-secondary">
            <i className="fas fa-upload mr-2"></i>Opponent Roster
          </h3>
          <div 
            className="upload-zone rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 hover:border-secondary"
            onClick={() => opponentFileRef.current?.click()}
          >
            <input
              ref={opponentFileRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'opponent');
              }}
              data-testid="input-opponent-roster"
            />
            <i className="fas fa-cloud-upload-alt text-4xl text-secondary mb-4 animate-bounce-slow"></i>
            <p className="font-semibold mb-2">Drop opponent roster here</p>
            <p className="text-sm text-slate-400">or click to browse files</p>
            <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 10MB</p>
          </div>

          {opponentRoster && (
            <RosterDisplay 
              roster={opponentRoster} 
              type="opponent"
              isEditing={editingRoster === 'opponent'}
            />
          )}
        </div>
      </div>

      {isProcessingOCR && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-300">Processing images with OCR...</p>
        </div>
      )}

      <div className="flex justify-center pt-8">
        <Button
          onClick={nextStep}
          disabled={!canProceed || isProcessingOCR}
          className="bg-gradient-to-r from-primary to-secondary px-8 py-4 rounded-2xl font-semibold text-lg hover:scale-105 transform transition-all duration-300 shadow-xl hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          data-testid="button-continue-style"
        >
          <i className="fas fa-arrow-right mr-2"></i>Continue to Style Selection
        </Button>
      </div>
    </div>
  );
}
