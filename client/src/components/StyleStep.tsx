import { useQuizStore } from '@/stores/quizStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Genre, Tone, Persona, RatingMode } from '@shared/schema';

const genres = [
  { id: 'country' as Genre, name: 'Country', icon: 'fas fa-hat-cowboy', color: 'text-yellow-500', description: 'Honky-tonk heat' },
  { id: 'rap' as Genre, name: 'Rap', icon: 'fas fa-microphone-alt', color: 'text-purple-500', description: 'Hard-hitting bars' },
  { id: 'electronic' as Genre, name: 'Electronic', icon: 'fas fa-bolt', color: 'text-blue-500', description: 'High-energy beats' },
  { id: 'pop' as Genre, name: 'Pop', icon: 'fas fa-heart', color: 'text-pink-500', description: 'Catchy hooks' },
  { id: 'blues' as Genre, name: 'Blues', icon: 'fas fa-guitar', color: 'text-indigo-500', description: 'Soulful riffs' },
  { id: 'funk' as Genre, name: 'Funk', icon: 'fas fa-record-vinyl', color: 'text-green-500', description: 'Groovy bass' },
  { id: 'rnb' as Genre, name: 'R&B', icon: 'fas fa-music', color: 'text-red-500', description: 'Smooth vocals' },
  { id: 'gospel' as Genre, name: 'Gospel', icon: 'fas fa-praying-hands', color: 'text-gold', description: 'Uplifting spirit' }
];

const tones = [
  { id: 'mild' as Tone, name: 'Mild', icon: 'fas fa-smile', color: 'text-green-500', description: 'Playful banter' },
  { id: 'medium' as Tone, name: 'Medium', icon: 'fas fa-fire', color: 'text-orange-500', description: 'Competitive edge' },
  { id: 'savage' as Tone, name: 'Savage', icon: 'fas fa-skull', color: 'text-red-500', description: 'No mercy' }
];

const personas = [
  { id: 'first_person' as Persona, name: 'First Person', icon: 'fas fa-users', description: "We're gonna dominate" },
  { id: 'narrator' as Persona, name: 'Narrator', icon: 'fas fa-eye', description: "They're about to lose" }
];

const ratings = [
  { id: 'PG' as RatingMode, name: 'PG Clean', icon: 'fas fa-check-circle', color: 'text-green-500', description: 'Family-friendly' },
  { id: 'NSFW' as RatingMode, name: 'NSFW', icon: 'fas fa-exclamation-triangle', color: 'text-orange-500', description: 'Adult language allowed' }
];

export function StyleStep() {
  const {
    genre,
    tone,
    persona,
    ratingMode,
    setStyle,
    nextStep
  } = useQuizStore();

  const handleGenreSelect = (selectedGenre: Genre) => {
    setStyle({ genre: selectedGenre });
  };

  const handleToneSelect = (selectedTone: Tone) => {
    setStyle({ tone: selectedTone });
  };

  const handlePersonaSelect = (selectedPersona: Persona) => {
    setStyle({ persona: selectedPersona });
  };

  const handleRatingSelect = (selectedRating: RatingMode) => {
    setStyle({ ratingMode: selectedRating });
  };

  return (
    <div className="glass-card rounded-3xl p-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
          <i className="fas fa-music text-3xl text-white"></i>
        </div>
        <h2 className="text-3xl font-bold mb-3">Choose Your Anthem Style</h2>
        <p className="text-slate-300">Customize the genre, tone, and style of your trash talk anthem</p>
      </div>

      <div className="space-y-8">
        {/* Genre Selection */}
        <div>
          <h3 className="text-xl font-semibold mb-4">
            <i className="fas fa-compact-disc mr-2 text-primary"></i>Genre
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {genres.map((g) => (
              <div
                key={g.id}
                className={cn(
                  'style-card rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 hover:scale-105',
                  genre === g.id && 'selected border-primary bg-primary/10 shadow-primary/30'
                )}
                onClick={() => handleGenreSelect(g.id)}
                data-testid={`style-genre-${g.id}`}
              >
                <i className={`${g.icon} text-3xl ${g.color} mb-3`}></i>
                <p className="font-semibold">{g.name}</p>
                <p className="text-xs text-slate-400 mt-1">{g.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tone Selection */}
        <div>
          <h3 className="text-xl font-semibold mb-4">
            <i className="fas fa-thermometer-half mr-2 text-secondary"></i>Intensity Level
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {tones.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'style-card rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 hover:scale-105',
                  tone === t.id && 'selected border-primary bg-primary/10 shadow-primary/30'
                )}
                onClick={() => handleToneSelect(t.id)}
                data-testid={`style-tone-${t.id}`}
              >
                <i className={`${t.icon} text-2xl ${t.color} mb-3`}></i>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-slate-400 mt-1">{t.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Persona & Rating */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">
              <i className="fas fa-user mr-2 text-primary"></i>Perspective
            </h3>
            <div className="space-y-3">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'style-card rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02]',
                    persona === p.id && 'selected border-primary bg-primary/10'
                  )}
                  onClick={() => handlePersonaSelect(p.id)}
                  data-testid={`style-persona-${p.id}`}
                >
                  <div className="flex items-center">
                    <i className={`${p.icon} mr-3 ${persona === p.id ? 'text-primary' : 'text-slate-400'}`}></i>
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">
              <i className="fas fa-shield-alt mr-2 text-secondary"></i>Content Rating
            </h3>
            <div className="space-y-3">
              {ratings.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    'style-card rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02]',
                    ratingMode === r.id && 'selected border-primary bg-primary/10'
                  )}
                  onClick={() => handleRatingSelect(r.id)}
                  data-testid={`style-rating-${r.id}`}
                >
                  <div className="flex items-center">
                    <i className={`${r.icon} mr-3 ${r.color}`}></i>
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <Button
          onClick={nextStep}
          className="bg-gradient-to-r from-primary to-secondary px-8 py-4 rounded-2xl font-semibold text-lg hover:scale-105 transform transition-all duration-300 shadow-xl hover:shadow-primary/25"
          data-testid="button-generate-anthem"
        >
          <i className="fas fa-magic mr-2"></i>Generate My Anthem
        </Button>
      </div>
    </div>
  );
}
