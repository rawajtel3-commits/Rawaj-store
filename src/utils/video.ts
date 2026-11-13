export type VideoSourceType = 'html5' | 'youtube' | 'vimeo';

export interface ParsedVideoSource {
  type: VideoSourceType;
  src: string;
  originalUrl: string;
}

export function parseVideoSource(url: string): ParsedVideoSource {
  const trimmed = (url || '').trim();

  // YouTube patterns: watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
      originalUrl: trimmed,
    };
  }

  // Vimeo pattern: vimeo.com/123456789
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      originalUrl: trimmed,
    };
  }

  return {
    type: 'html5',
    src: trimmed,
    originalUrl: trimmed,
  };
}

export function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
