export interface VideoInfo {
  isEmbed: boolean;
  embedUrl: string;
  isDirectVideo: boolean;
  videoType: 'youtube' | 'vimeo' | 'direct' | 'none';
}

export const parseVideoUrl = (url: string | null | undefined): VideoInfo => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { isEmbed: false, embedUrl: '', isDirectVideo: false, videoType: 'none' };
  }

  const trimmed = url.trim();

  // YouTube matchers:
  // - https://www.youtube.com/watch?v=ID
  // - https://youtube.com/watch?v=ID
  // - https://youtu.be/ID
  // - https://www.youtube.com/embed/ID
  // - https://www.youtube.com/shorts/ID
  // - https://www.youtube.com/live/ID
  const ytMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isEmbed: true,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&playsinline=1&rel=0`,
      isDirectVideo: false,
      videoType: 'youtube'
    };
  }

  // Vimeo matcher:
  const vimeoMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&autopause=0`,
      isDirectVideo: false,
      videoType: 'vimeo'
    };
  }

  // Direct video file or direct stream
  return {
    isEmbed: false,
    embedUrl: trimmed,
    isDirectVideo: true,
    videoType: 'direct'
  };
};
