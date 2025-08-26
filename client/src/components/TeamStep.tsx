import { useState, useEffect } from 'react';
import { useQuizStore } from '@/stores/quizStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TeamStep() {
  const {
    teamName,
    opponentTeamName,
    setTeamNames,
    nextStep,
    canProceedToStep
  } = useQuizStore();
  
  const [localTeamName, setLocalTeamName] = useState(teamName);
  const [localOpponentName, setLocalOpponentName] = useState(opponentTeamName);

  useEffect(() => {
    setTeamNames(localTeamName, localOpponentName);
  }, [localTeamName, localOpponentName, setTeamNames]);

  const canProceed = canProceedToStep(2);

  return (
    <div className="glass-card rounded-3xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
          <i className="fas fa-trophy text-3xl text-white"></i>
        </div>
        <h2 className="text-3xl font-bold mb-3">Let's Create Your Anthem</h2>
        <p className="text-slate-300">Enter your team names to get started with your personalized trash talk song</p>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="block text-sm font-semibold mb-3 text-slate-200">
            <i className="fas fa-users mr-2 text-primary"></i>Your Team Name
          </Label>
          <Input
            type="text"
            placeholder="The Touchdown Titans"
            value={localTeamName}
            onChange={(e) => setLocalTeamName(e.target.value)}
            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg font-medium"
            data-testid="input-team-name"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-semibold mb-3 text-slate-200">
            <i className="fas fa-users-slash mr-2 text-secondary"></i>Opponent Team Name
          </Label>
          <Input
            type="text"
            placeholder="The Fumble Bunch"
            value={localOpponentName}
            onChange={(e) => setLocalOpponentName(e.target.value)}
            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg font-medium"
            data-testid="input-opponent-name"
          />
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={nextStep}
            disabled={!canProceed}
            className="bg-gradient-to-r from-primary to-secondary px-8 py-4 rounded-2xl font-semibold text-lg hover:scale-105 transform transition-all duration-300 shadow-xl hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            data-testid="button-continue-roster"
          >
            <i className="fas fa-arrow-right mr-2"></i>Continue to Roster Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
