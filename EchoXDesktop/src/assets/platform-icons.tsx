import type { PlatformIconType } from '../lib/source-registry';

interface IconProps {
  size?: number;
  className?: string;
}

export function YouTubeIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="5" width="21" height="14" rx="4.5" fill="#FF0000"/>
      <path d="M10 9.5 16 12l-6 2.5V9.5Z" fill="white"/>
    </svg>
  );
}

export function InstagramIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ig-bg" x1="6" y1="22" x2="18" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F58529"/>
          <stop offset="30%"  stopColor="#DD2A7B"/>
          <stop offset="65%"  stopColor="#8134AF"/>
          <stop offset="100%" stopColor="#515BD4"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-bg)"/>
      <rect x="7" y="7" width="10" height="10" rx="3.2" stroke="white" strokeWidth="1.6" fill="none"/>
      <circle cx="12" cy="12" r="2.6" stroke="white" strokeWidth="1.5" fill="none"/>
      <circle cx="17" cy="7" r="1.1" fill="white"/>
    </svg>
  );
}

export function XIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#000000"/>
      <path d="M7 7h3l2.5 3.5L15 7h2l-3.8 5 4.3 5h-3L12 13.5 9.5 17H7l4-4.8L7 7Z" fill="white"/>
    </svg>
  );
}

export function RedditIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#FF4500"/>
      <circle cx="12" cy="7.5" r="2" fill="white" opacity="0"/>
      <path d="M19.5 12a2 2 0 0 0-3.4-1.4A8.5 8.5 0 0 0 12 9a8.5 8.5 0 0 0-4.1 1.6A2 2 0 1 0 4.5 12a5.5 5.5 0 0 0 2.4 4.5 7.5 7.5 0 0 0 10.2 0A5.5 5.5 0 0 0 19.5 12Z" stroke="white" strokeWidth="1.2" fill="none"/>
      <circle cx="9.5" cy="12.5" r="1.1" fill="white"/>
      <circle cx="14.5" cy="12.5" r="1.1" fill="white"/>
      <path d="M10 15c.5.9 3.5.9 4 0" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
      <circle cx="16.5" cy="8" r="1.6" fill="white"/>
      <circle cx="12.8" cy="9" r="0.9" fill="#FF4500"/>
    </svg>
  );
}

export function TwitchIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#9146FF"/>
      <path d="M7.5 6H16V13.5L13 16.5H11L9 14.5H7.5V6Z" stroke="white" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
      <path d="M11 9.5V12.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M14 9.5V12.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export function VimeoIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#1AB7EA"/>
      <path d="M17.5 9.8c-.1 3-2.2 7-6.7 12.1" stroke="white" strokeWidth="0" fill="none"/>
      <path d="M7 9.5c0-.7.5-.8 1.5-.8 2 0 3 2 3.5 4l.5 1.8c.3 1 .5 1.5.8 1.5s.7-.5 1.3-1.5c.9-1.5 1.4-3 1.4-4.2 0-1-.5-1.5-1-1.5-.5 0-.9.2-1.2.5.6-2 2-3 3.2-3 2 0 2.5 2 2.5 3.5 0 2.5-2 6.2-3.7 8.5C14 20.5 13 21 12 21s-1.8-.8-2.5-3L8 12.5C7.5 11 7 9.5 7 9.5Z" fill="white"/>
    </svg>
  );
}

export function BilibiliIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="5" width="20" height="15" rx="3" fill="#00A1D6"/>
      <path d="M8.5 5 7 3" stroke="#00A1D6" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15.5 5 17 3" stroke="#00A1D6" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8.5 3 7 5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M15.5 3 17 5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      <rect x="6.5" y="9" width="4" height="5" rx="2" fill="white" opacity="0.9"/>
      <rect x="13.5" y="9" width="4" height="5" rx="2" fill="white" opacity="0.9"/>
      <path d="M8.5 17h7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

export function TikTokIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#010101"/>
      <path
        d="M14 7c0 2.2 1.8 4 4 4v2.5A6.5 6.5 0 0 1 14 12v5a4.5 4.5 0 1 1-4.5-4.5v2.7a1.8 1.8 0 1 0 1.8 1.8V7H14Z"
        fill="white"
      />
      <path
        d="M14 7c0 2.2 1.8 4 4 4"
        stroke="#69C9D0"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PinterestIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#E60023"/>
      <path d="M12 6.5c-3 0-5.5 2.5-5.5 5.5 0 2.3 1.4 4.4 3.4 5.2-.1-.5-.1-1.2 0-1.8l.9-3.7s-.2-.5-.2-1.2c0-1.1.6-2 1.5-2 .7 0 1.1.5 1.1 1.2 0 .7-.5 1.8-.7 2.7-.2.8.4 1.5 1.2 1.5 1.4 0 2.5-1.5 2.5-3.6 0-1.9-1.3-3.2-3.2-3.2-2.1 0-3.4 1.6-3.4 3.2 0 .6.2 1.3.6 1.6.1.1.1.1 0 .3l-.2.9c0 .1-.1.2-.3.1-1.3-.6-2.1-2.4-2.1-3.9 0-3.2 2.3-6.1 6.6-6.1 3.5 0 6.2 2.5 6.2 5.8 0 3.4-2.2 6.2-5.2 6.2-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.8 1.9-1.2 2.5.9.3 1.9.4 2.9.4 5 0 9-4 9-9s-4-8.8-9-8.8Z" fill="white"/>
    </svg>
  );
}

export function GenericVideoIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="4.5" width="20" height="15" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 9l6 3-6 3V9Z" fill="currentColor"/>
    </svg>
  );
}

export function GenericAudioIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 18V6l12-2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

export function CheckCircleIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function GlobalIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5"/>
      <ellipse cx="12" cy="12" rx="3.5" ry="9.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2.5 9h19M2.5 15h19" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="m10 10 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function FilterIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 4h12M5 8h6M7.5 12h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

const ICON_MAP: Record<PlatformIconType, React.ComponentType<IconProps>> = {
  youtube:   YouTubeIcon,
  instagram: InstagramIcon,
  x:         XIcon,
  reddit:    RedditIcon,
  twitch:    TwitchIcon,
  vimeo:     VimeoIcon,
  bilibili:  BilibiliIcon,
  tiktok:    TikTokIcon,
  generic:   GenericVideoIcon,
};

interface PlatformIconProps extends IconProps {
  type: PlatformIconType;
}

export function PlatformIcon({ type, size = 20, className }: PlatformIconProps) {
  const Icon = ICON_MAP[type] ?? GenericVideoIcon;
  return <Icon size={size} className={className} />;
}
