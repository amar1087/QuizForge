import { useQuizStore } from '@/stores/quizStore';
import { cn } from '@/lib/utils';

const steps = [
  { number: 1, title: 'Team Names', icon: 'fas fa-users' },
  { number: 2, title: 'Upload Rosters', icon: 'fas fa-camera' },
  { number: 3, title: 'Choose Style', icon: 'fas fa-music' },
  { number: 4, title: 'Generate', icon: 'fas fa-magic' }
];

export function QuizProgress() {
  const currentStep = useQuizStore(state => state.currentStep);

  return (
    <div className="glass-card rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-1">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                  currentStep >= step.number
                    ? 'bg-primary text-white'
                    : 'bg-white/20 text-slate-400'
                )}
              >
                {step.number}
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    'w-16 h-0.5 mx-2 transition-all duration-300',
                    currentStep > step.number
                      ? 'bg-primary'
                      : 'bg-white/20'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-slate-300">
          <span className="font-semibold text-primary">Step {currentStep}</span> of 4 - {steps[currentStep - 1]?.title}
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        {steps.map(step => (
          <span key={step.number}>{step.title}</span>
        ))}
      </div>
    </div>
  );
}
