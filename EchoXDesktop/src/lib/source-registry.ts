export type PlatformCategory =
  | 'social'
  | 'video'
  | 'streaming'
  | 'news'
  | 'sports'
  | 'music'
  | 'education'
  | 'other';

export type PlatformIconType =
  | 'youtube'
  | 'instagram'
  | 'x'
  | 'reddit'
  | 'twitch'
  | 'vimeo'
  | 'bilibili'
  | 'tiktok'
  | 'generic';

export interface TopPlatform {
  id: string;
  name: string;
  tagline: string;
  category: PlatformCategory;
  iconType: PlatformIconType;
}

export interface SiteEntry {
  name: string;
  category: PlatformCategory;
}

export const TOP_PLATFORMS: TopPlatform[] = [
  { id: 'youtube',        name: 'YouTube',         tagline: 'Videos, live streams & playlists',  category: 'video',     iconType: 'youtube'   },
  { id: 'youtube-shorts', name: 'YouTube Shorts',  tagline: 'Short-form vertical video',         category: 'social',    iconType: 'youtube'   },
  { id: 'instagram',      name: 'Instagram Reels', tagline: 'Reels, stories & video posts',      category: 'social',    iconType: 'instagram' },
  { id: 'x',              name: 'X (Twitter)',     tagline: 'Videos, GIFs & Spaces',             category: 'social',    iconType: 'x'         },
  { id: 'reddit',         name: 'Reddit',          tagline: 'Video posts & embedded media',      category: 'social',    iconType: 'reddit'    },
  { id: 'vimeo',          name: 'Vimeo',           tagline: 'Professional video hosting',        category: 'video',     iconType: 'vimeo'     },
  { id: 'twitch',         name: 'Twitch',          tagline: 'Clips, VODs & live streams',        category: 'streaming', iconType: 'twitch'    },
  { id: 'bilibili',       name: 'Bilibili',        tagline: 'Chinese video platform',            category: 'video',     iconType: 'bilibili'  },
  { id: 'tiktok',         name: 'TikTok',          tagline: 'Short videos & creator content',    category: 'social',    iconType: 'tiktok'    },
];

export const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  social:    'Social Media',
  video:     'Video Platforms',
  streaming: 'Live Streaming',
  news:      'News & Media',
  sports:    'Sports',
  music:     'Music & Audio',
  education: 'Education',
  other:     'Other',
};

export const SITE_DIRECTORY: SiteEntry[] = [
  // Social Media
  { name: 'YouTube',               category: 'social'    },
  { name: 'YouTube Shorts',        category: 'social'    },
  { name: 'YouTube Music',         category: 'music'     },
  { name: 'YouTube Live',          category: 'streaming' },
  { name: 'Instagram',             category: 'social'    },
  { name: 'Instagram Reels',       category: 'social'    },
  { name: 'Instagram Stories',     category: 'social'    },
  { name: 'TikTok',                category: 'social'    },
  { name: 'X (Twitter)',           category: 'social'    },
  { name: 'Reddit',                category: 'social'    },
  { name: 'Facebook',              category: 'social'    },
  { name: 'Facebook Watch',        category: 'video'     },
  { name: 'Facebook Live',         category: 'streaming' },
  { name: 'Pinterest',             category: 'social'    },
  { name: 'Snapchat Spotlight',    category: 'social'    },
  { name: 'LinkedIn Video',        category: 'social'    },
  { name: 'BeReal',                category: 'social'    },
  { name: 'Mastodon',              category: 'social'    },
  { name: 'Threads',               category: 'social'    },
  { name: 'Bluesky',               category: 'social'    },
  // Video Platforms
  { name: 'Vimeo',                 category: 'video'     },
  { name: 'Dailymotion',           category: 'video'     },
  { name: 'Rumble',                category: 'video'     },
  { name: 'Odysee',                category: 'video'     },
  { name: 'BitChute',              category: 'video'     },
  { name: 'PeerTube',              category: 'video'     },
  { name: 'Streamable',            category: 'video'     },
  { name: 'Gfycat',               category: 'video'     },
  { name: 'Imgur',                 category: 'video'     },
  { name: 'Giphy',                 category: 'video'     },
  { name: 'Wistia',                category: 'video'     },
  { name: 'Brightcove',            category: 'video'     },
  { name: 'JW Player',             category: 'video'     },
  { name: 'Vidio',                 category: 'video'     },
  { name: 'DTube',                 category: 'video'     },
  { name: 'LBRY',                  category: 'video'     },
  { name: 'Metacafe',              category: 'video'     },
  { name: 'Break',                 category: 'video'     },
  { name: 'Veoh',                  category: 'video'     },
  { name: 'Vidme',                 category: 'video'     },
  // Live Streaming
  { name: 'Twitch',                category: 'streaming' },
  { name: 'Kick',                  category: 'streaming' },
  { name: 'Caffeine',              category: 'streaming' },
  { name: 'Trovo',                 category: 'streaming' },
  { name: 'Nimo TV',               category: 'streaming' },
  { name: 'Douyu',                 category: 'streaming' },
  { name: 'Huya',                  category: 'streaming' },
  { name: 'Naver NOW',             category: 'streaming' },
  { name: 'AfreecaTV',             category: 'streaming' },
  { name: 'Chzzk',                 category: 'streaming' },
  // Chinese Platforms
  { name: 'Bilibili',              category: 'video'     },
  { name: 'Bilibili Bangumi',      category: 'video'     },
  { name: 'iQiyi',                 category: 'video'     },
  { name: 'Youku',                 category: 'video'     },
  { name: 'Sohu Video',            category: 'video'     },
  { name: 'Weibo Video',           category: 'social'    },
  { name: 'MangoTV',               category: 'video'     },
  { name: 'WeTV',                  category: 'video'     },
  { name: 'Tencent Video',         category: 'video'     },
  { name: 'Douyin',                category: 'social'    },
  { name: 'Kuaishou',              category: 'social'    },
  { name: 'Xigua Video',           category: 'video'     },
  { name: 'MGTV',                  category: 'video'     },
  // Japanese & Korean
  { name: 'Niconico',              category: 'video'     },
  { name: 'AbemaTV',               category: 'streaming' },
  { name: 'TVer',                  category: 'video'     },
  { name: 'NHK',                   category: 'news'      },
  { name: 'LINE TV',               category: 'video'     },
  { name: 'KKTV',                  category: 'video'     },
  { name: 'GYAO',                  category: 'video'     },
  { name: 'Wavve',                 category: 'video'     },
  { name: 'Watcha',                category: 'video'     },
  // News & Media
  { name: 'BBC iPlayer',           category: 'news'      },
  { name: 'BBC News',              category: 'news'      },
  { name: 'CNN',                   category: 'news'      },
  { name: 'Fox News',              category: 'news'      },
  { name: 'MSNBC',                 category: 'news'      },
  { name: 'ABC News',              category: 'news'      },
  { name: 'CBS News',              category: 'news'      },
  { name: 'NBC News',              category: 'news'      },
  { name: 'Sky News',              category: 'news'      },
  { name: 'Al Jazeera',            category: 'news'      },
  { name: 'Deutsche Welle',        category: 'news'      },
  { name: 'France 24',             category: 'news'      },
  { name: 'Bloomberg',             category: 'news'      },
  { name: 'Reuters',               category: 'news'      },
  { name: 'VICE',                  category: 'news'      },
  { name: 'The Guardian',          category: 'news'      },
  { name: 'Time Magazine',         category: 'news'      },
  { name: 'Washington Post',       category: 'news'      },
  { name: 'The Atlantic',          category: 'news'      },
  { name: 'Vox',                   category: 'news'      },
  { name: 'Business Insider',      category: 'news'      },
  { name: 'TechCrunch',            category: 'news'      },
  { name: 'Wired',                 category: 'news'      },
  // Sports
  { name: 'ESPN',                  category: 'sports'    },
  { name: 'NFL',                   category: 'sports'    },
  { name: 'NBA',                   category: 'sports'    },
  { name: 'MLB',                   category: 'sports'    },
  { name: 'NHL',                   category: 'sports'    },
  { name: 'FIFA',                  category: 'sports'    },
  { name: 'UEFA',                  category: 'sports'    },
  { name: 'Formula 1',             category: 'sports'    },
  { name: 'MotoGP',                category: 'sports'    },
  { name: 'UFC',                   category: 'sports'    },
  { name: 'WWE',                   category: 'sports'    },
  { name: 'PGA Tour',              category: 'sports'    },
  { name: 'Tennis Channel',        category: 'sports'    },
  { name: 'Eurosport',             category: 'sports'    },
  { name: 'Sky Sports',            category: 'sports'    },
  { name: 'beIN Sports',           category: 'sports'    },
  { name: 'DAZN',                  category: 'sports'    },
  { name: 'CBS Sports',            category: 'sports'    },
  { name: 'NBC Sports',            category: 'sports'    },
  // Entertainment / Anime
  { name: 'Crunchyroll',           category: 'video'     },
  { name: 'Funimation',            category: 'video'     },
  { name: 'HIDIVE',                category: 'video'     },
  { name: 'VRV',                   category: 'video'     },
  { name: 'Pluto TV',              category: 'streaming' },
  { name: 'Tubi',                  category: 'streaming' },
  { name: 'Peacock',               category: 'streaming' },
  { name: 'The Roku Channel',      category: 'streaming' },
  { name: 'Hotstar',               category: 'streaming' },
  { name: 'ZEE5',                  category: 'streaming' },
  { name: 'SonyLIV',               category: 'streaming' },
  { name: 'JioCinema',             category: 'streaming' },
  { name: 'MX Player',             category: 'streaming' },
  { name: 'Mubi',                  category: 'video'     },
  { name: 'Kanopy',                category: 'education' },
  { name: 'Plex',                  category: 'streaming' },
  { name: 'Jellyfin',              category: 'streaming' },
  // Music & Audio
  { name: 'SoundCloud',            category: 'music'     },
  { name: 'Bandcamp',              category: 'music'     },
  { name: 'Audiomack',             category: 'music'     },
  { name: 'MixCloud',              category: 'music'     },
  { name: 'Jamendo',               category: 'music'     },
  { name: 'HearThis',              category: 'music'     },
  { name: 'ReverbNation',          category: 'music'     },
  { name: 'Boomplay',              category: 'music'     },
  { name: 'Newgrounds Audio',      category: 'music'     },
  // Podcasts
  { name: 'Podbean',               category: 'other'     },
  { name: 'BuzzSprout',            category: 'other'     },
  { name: 'Spreaker',              category: 'other'     },
  { name: 'Simplecast',            category: 'other'     },
  { name: 'Transistor',            category: 'other'     },
  // Education
  { name: 'Khan Academy',          category: 'education' },
  { name: 'TED',                   category: 'education' },
  { name: 'TED-Ed',                category: 'education' },
  { name: 'MIT OpenCourseWare',    category: 'education' },
  { name: 'Stanford Online',       category: 'education' },
  { name: 'Skillshare',            category: 'education' },
  { name: 'Udemy',                 category: 'education' },
  { name: 'Coursera',              category: 'education' },
  { name: 'edX',                   category: 'education' },
  { name: 'LinkedIn Learning',     category: 'education' },
  { name: 'Pluralsight',           category: 'education' },
  { name: 'O\'Reilly',             category: 'education' },
  { name: 'FreeCodeCamp',          category: 'education' },
  { name: 'Crash Course',          category: 'education' },
  // Other / Utility
  { name: 'Dropbox (public)',       category: 'other'     },
  { name: 'Google Drive (public)', category: 'other'     },
  { name: 'OneDrive (public)',      category: 'other'     },
  { name: 'Patreon',               category: 'other'     },
  { name: 'Loom',                  category: 'other'     },
  { name: 'Streamja',              category: 'other'     },
  { name: 'Generic HLS/MP4 URL',   category: 'other'     },
];
