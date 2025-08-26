export function buildNaiveLRC(lyrics: string, durationSec = 45): string {
  const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
  const lrcLines: string[] = [];
  
  const timePerLine = durationSec / lines.length;
  
  lines.forEach((line, index) => {
    const timestamp = Math.floor(index * timePerLine);
    const minutes = Math.floor(timestamp / 60);
    const seconds = timestamp % 60;
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.00`;
    
    // Skip section headers in timing
    if (line.startsWith('[') && line.endsWith(']')) {
      lrcLines.push(`[${timeString}]${line}`);
    } else {
      lrcLines.push(`[${timeString}]${line}`);
    }
  });
  
  return lrcLines.join('\n');
}

export function parseLRC(lrcContent: string): Array<{ time: number; text: string }> {
  const lines = lrcContent.split('\n');
  const parsed: Array<{ time: number; text: string }> = [];
  
  lines.forEach(line => {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const centiseconds = parseInt(match[3]);
      const text = match[4];
      
      const timeInSeconds = minutes * 60 + seconds + centiseconds / 100;
      parsed.push({ time: timeInSeconds, text });
    }
  });
  
  return parsed.sort((a, b) => a.time - b.time);
}
