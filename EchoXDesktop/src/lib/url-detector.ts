import type { PlatformIconType } from './source-registry';

export interface DetectionResult {
  label: string;
  platformId: string | null;
  iconType: PlatformIconType;
  isKnown: boolean;
}

interface DetectionPattern {
  pattern: RegExp;
  label: string;
  platformId: string;
  iconType: PlatformIconType;
}

const PATTERNS: DetectionPattern[] = [
  // YouTube Shorts — must test before generic YouTube
  {
    pattern: /youtube\.com\/shorts\//i,
    label: 'YouTube Shorts',
    platformId: 'youtube-shorts',
    iconType: 'youtube',
  },
  // YouTube Music
  {
    pattern: /music\.youtube\.com/i,
    label: 'YouTube Music',
    platformId: 'youtube-music',
    iconType: 'youtube',
  },
  // YouTube (generic: watch, live, embed, channel, @handle, youtu.be)
  {
    pattern: /(?:youtube\.com\/(?:watch|live|embed|v\/|c\/|channel\/|@)|youtu\.be\/)/i,
    label: 'YouTube',
    platformId: 'youtube',
    iconType: 'youtube',
  },
  // Instagram Reel — before generic Instagram
  {
    pattern: /instagram\.com\/(?:reel|reels)\//i,
    label: 'Instagram Reel',
    platformId: 'instagram-reel',
    iconType: 'instagram',
  },
  // Instagram (stories, posts, igtv, general)
  {
    pattern: /instagram\.com\//i,
    label: 'Instagram',
    platformId: 'instagram',
    iconType: 'instagram',
  },
  // TikTok
  {
    pattern: /tiktok\.com\//i,
    label: 'TikTok Video',
    platformId: 'tiktok',
    iconType: 'tiktok',
  },
  // X / Twitter
  {
    pattern: /(?:twitter\.com|x\.com)\//i,
    label: 'X Video',
    platformId: 'x',
    iconType: 'x',
  },
  // Reddit
  {
    pattern: /reddit\.com\//i,
    label: 'Reddit Video',
    platformId: 'reddit',
    iconType: 'reddit',
  },
  // Pinterest
  {
    pattern: /pinterest\.(?:com|co\.uk|fr|de|ca|au|it|es|jp|ru|se|pt|dk|no|fi|nz|ie)\//i,
    label: 'Pinterest Video',
    platformId: 'pinterest',
    iconType: 'generic',
  },
  // Vimeo
  {
    pattern: /vimeo\.com\//i,
    label: 'Vimeo Video',
    platformId: 'vimeo',
    iconType: 'vimeo',
  },
  // Twitch Clip — before generic Twitch
  {
    pattern: /(?:twitch\.tv\/(?:\w+\/clip)|clips\.twitch\.tv)\//i,
    label: 'Twitch Clip',
    platformId: 'twitch-clip',
    iconType: 'twitch',
  },
  // Twitch (VODs, streams, channels)
  {
    pattern: /twitch\.tv\//i,
    label: 'Twitch',
    platformId: 'twitch',
    iconType: 'twitch',
  },
  // Bilibili
  {
    pattern: /bilibili\.com\//i,
    label: 'Bilibili Video',
    platformId: 'bilibili',
    iconType: 'bilibili',
  },
  // Facebook
  {
    pattern: /(?:facebook\.com|fb\.watch)\//i,
    label: 'Facebook Video',
    platformId: 'facebook',
    iconType: 'generic',
  },
  // Dailymotion
  {
    pattern: /dailymotion\.com\//i,
    label: 'Dailymotion Video',
    platformId: 'dailymotion',
    iconType: 'generic',
  },
  // Kick
  {
    pattern: /kick\.com\//i,
    label: 'Kick Stream',
    platformId: 'kick',
    iconType: 'generic',
  },
  // SoundCloud
  {
    pattern: /soundcloud\.com\//i,
    label: 'SoundCloud Track',
    platformId: 'soundcloud',
    iconType: 'generic',
  },
  // Rumble
  {
    pattern: /rumble\.com\//i,
    label: 'Rumble Video',
    platformId: 'rumble',
    iconType: 'generic',
  },
  // Odysee
  {
    pattern: /odysee\.com\//i,
    label: 'Odysee Video',
    platformId: 'odysee',
    iconType: 'generic',
  },
  // Niconico
  {
    pattern: /nicovideo\.jp\//i,
    label: 'Niconico Video',
    platformId: 'niconico',
    iconType: 'generic',
  },
  // Crunchyroll
  {
    pattern: /crunchyroll\.com\//i,
    label: 'Crunchyroll',
    platformId: 'crunchyroll',
    iconType: 'generic',
  },
];

function withScheme(raw: string): string {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function detectPlatform(rawUrl: string): DetectionResult | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const url = withScheme(trimmed);

  // Reject strings that can't be URLs
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('.')) return null;
  } catch {
    return null;
  }

  for (const entry of PATTERNS) {
    if (entry.pattern.test(url)) {
      return {
        label: entry.label,
        platformId: entry.platformId,
        iconType: entry.iconType,
        isKnown: true,
      };
    }
  }

  return {
    label: 'Other Supported Source',
    platformId: null,
    iconType: 'generic',
    isKnown: false,
  };
}

export function isValidUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(withScheme(trimmed));
    return parsed.hostname.length > 1 && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

export function normalizeUrl(rawUrl: string): string {
  return withScheme(rawUrl.trim());
}
