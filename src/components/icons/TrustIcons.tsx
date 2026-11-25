import React from 'react';

export function TrustShieldLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 36" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="trustShieldGrad" x1="4" y1="2" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0500FF" />
          <stop offset="100%" stopColor="#0055FF" />
        </linearGradient>
      </defs>
      <path
        d="M16 1.5C11.4 5.2 6.2 6.6 2.5 7.1V17.4C2.5 25.5 8.5 31.8 16 34.5C23.5 31.8 29.5 25.5 29.5 17.4V7.1C25.8 6.6 20.6 5.2 16 1.5Z"
        fill="url(#trustShieldGrad)"
      />
      <path
        d="M16 5.2C12.3 8 8.3 9.2 5.6 9.6V17.3C5.6 23.6 10.3 28.5 16 30.8V5.2Z"
        fill="#00D2FF"
        fillOpacity="0.22"
      />
    </svg>
  );
}

export function BinanceIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 4L19.8 7.8L12.2 15.4L8.4 11.6L16 4ZM23.6 11.6L27.4 15.4L16 26.8L4.6 15.4L8.4 11.6L16 19.2L23.6 11.6ZM16 12.2L19.8 16L16 19.8L12.2 16L16 12.2ZM4.6 15.4L8.4 11.6M27.4 15.4L23.6 11.6"
        fill="#F0B90B"
      />
      <path d="M16 4L19.8 7.8L12.2 15.4L8.4 11.6L16 4Z" fill="#F0B90B" />
      <path d="M23.6 11.6L27.4 15.4L16 26.8L4.6 15.4L8.4 11.6L16 19.2L23.6 11.6Z" fill="#F0B90B" />
      <path d="M4.6 15.4L7.2 12.8L9.8 15.4L7.2 18L4.6 15.4Z" fill="#F0B90B" />
      <path d="M22.2 15.4L24.8 12.8L27.4 15.4L24.8 18L22.2 15.4Z" fill="#F0B90B" />
    </svg>
  );
}

export function HomeNavIcon({ active, className = 'w-5 h-5' }: { active?: boolean; className?: string }) {
  const color = active ? '#0500FF' : '#141416';
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 10.2C4.5 9.4 4.88 8.65 5.52 8.18L10.52 4.52C11.4 3.88 12.6 3.88 13.48 4.52L18.48 8.18C19.12 8.65 19.5 9.4 19.5 10.2V17.5C19.5 18.88 18.38 20 17 20H7C5.62 20 4.5 18.88 4.5 17.5V10.2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={active ? '#0500FF' : 'none'}
        fillOpacity={active ? '0.1' : '0'}
      />
      <path d="M9.5 15.2H14.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function UfoEmptyIllustration({ className = 'w-44 h-40' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ufoBeam" x1="100" y1="68" x2="148" y2="175" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#48FFA5" stopOpacity="0.88" />
          <stop offset="52%" stopColor="#58E3E8" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="ufoBeamSpot" x1="115" y1="158" x2="172" y2="178" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7CFFD4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="ufoRim" x1="34" y1="54" x2="138" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B85CFF" />
          <stop offset="48%" stopColor="#5E68FF" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id="ufoBody" x1="56" y1="22" x2="112" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1B254B" />
          <stop offset="100%" stopColor="#080B1A" />
        </linearGradient>
        <radialGradient id="ufoCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#99FFD1" />
          <stop offset="65%" stopColor="#45FF9E" />
          <stop offset="100%" stopColor="#10B981" />
        </radialGradient>
      </defs>

      {/* Tractor beam cone */}
      <path d="M84 74L112 167C119 178 164 176 173 157L112 65L84 74Z" fill="url(#ufoBeam)" />
      {/* Beam ground ellipse */}
      <ellipse
        cx="143"
        cy="163"
        rx="31"
        ry="11"
        transform="rotate(-9 143 163)"
        fill="url(#ufoBeamSpot)"
        stroke="#4EA8FF"
        strokeOpacity="0.55"
        strokeWidth="1.4"
      />

      {/* Saucer tilted group */}
      <g transform="rotate(-17 88 55)">
        {/* Outer purple-to-cyan saucer rim */}
        <ellipse cx="88" cy="56" rx="52" ry="21" fill="url(#ufoRim)" />
        {/* Dark saucer hull */}
        <ellipse cx="88" cy="55" rx="48.5" ry="18.5" fill="url(#ufoBody)" />

        {/* Subtle geometric mesh lines across saucer */}
        <ellipse cx="88" cy="54" rx="37" ry="13.5" stroke="#2D4292" strokeOpacity="0.6" strokeWidth="0.9" />
        <path d="M40 55H136" stroke="#2D4292" strokeOpacity="0.55" strokeWidth="0.9" />
        <path d="M88 37V73" stroke="#2D4292" strokeOpacity="0.55" strokeWidth="0.9" />
        <path d="M54 42L122 68" stroke="#2D4292" strokeOpacity="0.45" strokeWidth="0.8" />
        <path d="M122 42L54 68" stroke="#2D4292" strokeOpacity="0.45" strokeWidth="0.8" />

        {/* Top cockpit dome */}
        <path
          d="M68 48C68 35.5 77 27 88 27C99 27 108 35.5 108 48H68Z"
          fill="#0B1126"
          stroke="#4F66FF"
          strokeOpacity="0.7"
          strokeWidth="1.2"
        />
        <path
          d="M74 44C76 36 81 31.5 88 31.5"
          stroke="#93C5FD"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Rim lights */}
        <circle cx="52" cy="58" r="1.7" fill="#E0E7FF" />
        <circle cx="59" cy="63" r="1.7" fill="#A5F3FC" />
        <circle cx="67" cy="66" r="1.7" fill="#A5F3FC" />

        {/* Glowing underside emitter */}
        <ellipse cx="91" cy="67" rx="16" ry="7.5" fill="url(#ufoCore)" />
      </g>
    </svg>
  );
}

function BnbSmartChainMark({ className = 'w-[66%] h-[66%]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      {/* Top chevron */}
      <path
        d="M16 3.8L20.5 6.4L19.4 8.27L16 6.3L12.6 8.27L11.5 6.4L16 3.8Z"
        fill="#F3BA2F"
      />
      {/* Left outer C-bracket */}
      <path
        d="M10 7.27L11.1 9.13L7.6 11.15V20.85L11.1 22.87L10 24.73L5.43 22.1V9.9L10 7.27Z"
        fill="#F3BA2F"
      />
      {/* Right outer C-bracket */}
      <path
        d="M22 7.27L26.57 9.9V22.1L22 24.73L20.9 22.87L24.4 20.85V11.15L20.9 9.13L22 7.27Z"
        fill="#F3BA2F"
      />
      {/* Bottom chevron */}
      <path
        d="M16 28.2L11.5 25.6L12.6 23.73L16 25.7L19.4 23.73L20.5 25.6L16 28.2Z"
        fill="#F3BA2F"
      />
      {/* Center bold Y */}
      <path
        d="M16 13.8L20.5 11.2L22.7 12.47V14.08L17.8 16.91V22.3L16 23.35L14.2 22.3V16.91L9.3 14.08V12.47L11.5 11.2L16 13.8Z"
        fill="#F3BA2F"
      />
      {/* Top inner diamond */}
      <path
        d="M16 8.35L18.5 10.05L16 11.75L13.5 10.05L16 8.35Z"
        fill="#F3BA2F"
      />
      {/* Bottom-left inner diamond */}
      <path
        d="M10.9 16.68L12.8 18.88L10.9 21.08L9 18.88L10.9 16.68Z"
        fill="#F3BA2F"
      />
      {/* Bottom-right inner diamond */}
      <path
        d="M21.1 16.68L23 18.88L21.1 21.08L19.2 18.88L21.1 16.68Z"
        fill="#F3BA2F"
      />
    </svg>
  );
}

const NATIVE_COIN_NETWORK: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'bsc',
  SOL: 'solana',
  TRX: 'tron',
  BCH: 'bitcoincash',
  ADA: 'cardano',
  KAVA: 'kava',
};

export function TokenBadgeIcon({
  symbol,
  networkId,
  showNetworkBadge,
  className = 'w-9 h-9',
}: {
  symbol: string;
  networkId?: string;
  showNetworkBadge?: boolean;
  className?: string;
}) {
  const s = symbol.toUpperCase();
  const shouldShowBadge =
    Boolean(networkId) &&
    (showNetworkBadge !== undefined
      ? showNetworkBadge
      : NATIVE_COIN_NETWORK[s] !== networkId);

  const renderMainIcon = () => {
    if (s === 'BTC') {
      return (
        <div className="w-full h-full rounded-full bg-[#F7931A] flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-[66%] h-[66%] rotate-[14deg]"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M14.7 11.4C15.6 10.9 16.1 10.1 16 9C15.9 7.6 14.8 6.9 13.1 6.7V4.8H11.8V6.6H10.7V4.8H9.4V6.6H7.2V8H8.2C8.7 8 8.9 8.2 8.9 8.6V15.3C8.9 15.7 8.7 15.9 8.2 15.9H7.2V17.4H9.4V19.2H10.7V17.4H11.8V19.2H13.1V17.4C15.2 17.2 16.6 16.2 16.7 14.4C16.8 12.9 16 11.9 14.7 11.4ZM10.7 8.1H12.2C13.3 8.1 13.9 8.6 13.9 9.4C13.9 10.2 13.3 10.7 12.2 10.7H10.7V8.1ZM12.6 15.8H10.7V12.5H12.6C13.8 12.5 14.5 13 14.5 14.1C14.5 15.2 13.8 15.8 12.6 15.8Z"
              fill="white"
            />
          </svg>
        </div>
      );
    }
    if (s === 'ETH') {
      return (
        <div className="w-full h-full rounded-full bg-[#ECEEF2] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none" aria-hidden="true">
            <path d="M12 3.2L6.8 12.1L12 15.2L17.2 12.1L12 3.2Z" fill="#23262B" />
            <path d="M12 3.2V15.2L17.2 12.1L12 3.2Z" fill="#636973" />
            <path d="M12 16.4L6.8 13.3L12 20.8L17.2 13.3L12 16.4Z" fill="#23262B" />
            <path d="M12 16.4V20.8L17.2 13.3L12 16.4Z" fill="#636973" />
          </svg>
        </div>
      );
    }
    if (s === 'BNB') {
      return (
        <div className="w-full h-full rounded-full bg-[#13171A] flex items-center justify-center">
          <BnbSmartChainMark className="w-[66%] h-[66%]" />
        </div>
      );
    }
    if (s === 'SOL') {
      return (
        <div className="w-full h-full rounded-full bg-[#111217] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[56%] h-[56%]" fill="none" aria-hidden="true">
            <path d="M6 15.5H16.5L18 17.5H7.5L6 15.5Z" fill="#14F195" />
            <path d="M7.5 11H18L16.5 13H6L7.5 11Z" fill="#00C2FF" />
            <path d="M6 6.5H16.5L18 8.5H7.5L6 6.5Z" fill="#9945FF" />
          </svg>
        </div>
      );
    }
    if (s === 'TRX') {
      return (
        <div className="w-full h-full rounded-full bg-[#EB0029] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none" aria-hidden="true">
            <path
              d="M5.5 6.8L16.8 8.9L19.2 11.3L11.2 19.2L5.5 6.8Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M5.5 6.8L12.1 12.1L16.8 8.9" stroke="white" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M12.1 12.1L11.2 19.2" stroke="white" strokeWidth="1.3" />
            <path d="M12.1 12.1L19.2 11.3" stroke="white" strokeWidth="1.3" />
          </svg>
        </div>
      );
    }
    if (s === 'TWT') {
      return (
        <div className="w-full h-full rounded-full bg-[#F7F8FB] flex items-center justify-center">
          <svg viewBox="0 0 32 36" className="w-[58%] h-[62%]" fill="none" aria-hidden="true">
            <path
              d="M16 2.6C11.6 6 6.8 7.3 3.4 7.8V17.4C3.4 25.1 9 31.1 16 33.6C23 31.1 28.6 25.1 28.6 17.4V7.8C25.2 7.3 20.4 6 16 2.6Z"
              fill="#FFFFFF"
              stroke="#0500FF"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            <path
              d="M16 2.6C11.6 6 6.8 7.3 3.4 7.8V17.4C3.4 25.1 9 31.1 16 33.6V2.6Z"
              fill="#0500FF"
            />
          </svg>
        </div>
      );
    }
    if (s === 'USDT') {
      return (
        <div className="w-full h-full rounded-full bg-[#26A17B] flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-[68%] h-[68%]" fill="none" aria-hidden="true">
            <path
              d="M17.92 17.16V17.15C17.81 17.16 17.24 17.19 15.98 17.19C14.97 17.19 14.26 17.16 14.01 17.15V17.16C10.12 16.99 7.22 16.31 7.22 15.5C7.22 14.69 10.12 14.01 14.01 13.84V16.49C14.26 16.51 14.99 16.55 16 16.55C17.21 16.55 17.81 16.5 17.92 16.49V13.84C21.81 14.01 24.7 14.69 24.7 15.5C24.7 16.31 21.81 16.99 17.92 17.16ZM17.92 13.56V11.19H23.34V7.59H8.59V11.19H14.01V13.56C9.61 13.76 6.3 14.63 6.3 15.67C6.3 16.71 9.61 17.58 14.01 17.78V25.33H17.92V17.78C22.31 17.58 25.61 16.71 25.61 15.67C25.61 14.63 22.31 13.76 17.92 13.56Z"
              fill="white"
            />
          </svg>
        </div>
      );
    }
    if (s === 'USDC') {
      return (
        <div className="w-full h-full rounded-full bg-[#2775CA] flex items-center justify-center text-white font-bold text-sm">
          $
        </div>
      );
    }
    if (s === 'LINK') {
      return (
        <div className="w-full h-full rounded-full bg-[#2A5ADA] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[54%] h-[54%]" fill="none" aria-hidden="true">
            <path d="M12 4.5L18.5 8.25V15.75L12 19.5L5.5 15.75V8.25L12 4.5Z" stroke="white" strokeWidth="2.4" />
          </svg>
        </div>
      );
    }
    if (s === 'UNI') {
      return (
        <div className="w-full h-full rounded-full bg-[#FF007A] flex items-center justify-center text-white font-bold text-[10px]">
          UNI
        </div>
      );
    }
    if (s === 'BCH') {
      return (
        <div className="w-full h-full rounded-full bg-[#0AC18E] flex items-center justify-center text-white font-bold text-[15px]">
          <span className="-rotate-12 inline-block">₿</span>
        </div>
      );
    }
    if (s === 'ADA') {
      return (
        <div className="w-full h-full rounded-full bg-[#0033AD] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="white" aria-hidden="true">
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="7.2" r="1.1" />
            <circle cx="12" cy="16.8" r="1.1" />
            <circle cx="7.8" cy="9.6" r="1.1" />
            <circle cx="16.2" cy="9.6" r="1.1" />
            <circle cx="7.8" cy="14.4" r="1.1" />
            <circle cx="16.2" cy="14.4" r="1.1" />
            <circle cx="12" cy="4.2" r="0.65" />
            <circle cx="12" cy="19.8" r="0.65" />
            <circle cx="5.2" cy="8.1" r="0.65" />
            <circle cx="18.8" cy="8.1" r="0.65" />
            <circle cx="5.2" cy="15.9" r="0.65" />
            <circle cx="18.8" cy="15.9" r="0.65" />
          </svg>
        </div>
      );
    }
    if (s === 'KAVA') {
      return (
        <div className="w-full h-full rounded-full bg-[#FF433E] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[56%] h-[56%]" fill="white" aria-hidden="true">
            <rect x="6.2" y="5.5" width="2.6" height="13" rx="0.4" />
            <path d="M10.2 12L15.4 5.5H18.4L13.1 12L18.4 18.5H15.4L10.2 12Z" />
          </svg>
        </div>
      );
    }
    if (s === 'ARB') {
      return (
        <div className="w-full h-full rounded-full bg-[#213147] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[60%] h-[60%]" fill="none" aria-hidden="true">
            <path d="M12 4L18.5 7.75V16.25L12 20L5.5 16.25V7.75L12 4Z" stroke="#96BEDC" strokeWidth="1.4" />
            <path d="M9.5 16.2L12.5 9.2L14 12.2L11.7 16.2H9.5Z" fill="white" />
            <path d="M13.6 16.2L15.4 12.6L16.6 15L15.8 16.2H13.6Z" fill="#12AAFF" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-full h-full rounded-full bg-[#2D374B] flex items-center justify-center text-white font-bold text-xs">
        {s.slice(0, 3)}
      </div>
    );
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {renderMainIcon()}
      {shouldShowBadge && networkId && (
        <NetworkLogoIcon
          networkId={networkId}
          className="w-[46%] h-[46%] absolute -bottom-[2px] -right-[2px] ring-[1.8px] ring-white shadow-xs"
        />
      )}
    </div>
  );
}

export function NetworkLogoIcon({
  networkId,
  className = 'w-9 h-9',
}: {
  networkId: string;
  className?: string;
}) {
  switch (networkId) {
    case 'bsc':
      return (
        <div className={`${className} rounded-full bg-[#13171A] flex items-center justify-center shrink-0`}>
          <BnbSmartChainMark className="w-[66%] h-[66%]" />
        </div>
      );
    case 'ethereum':
      return (
        <div className={`${className} rounded-full bg-[#ECEEF2] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
            <path d="M12 3.2L6.8 12.1L12 15.2L17.2 12.1L12 3.2Z" fill="#34383E" />
            <path d="M12 3.2V15.2L17.2 12.1L12 3.2Z" fill="#636973" />
            <path d="M12 16.4L6.8 13.3L12 20.8L17.2 13.3L12 16.4Z" fill="#34383E" />
            <path d="M12 16.4V20.8L17.2 13.3L12 16.4Z" fill="#636973" />
          </svg>
        </div>
      );
    case 'solana':
      return (
        <div className={`${className} rounded-full bg-[#09090B] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[56%] h-[56%]" fill="none">
            <path d="M6.2 15.6H16.3L17.8 17.5H7.7L6.2 15.6Z" fill="#14F195" />
            <path d="M7.7 11.1H17.8L16.3 13H6.2L7.7 11.1Z" fill="#00C2FF" />
            <path d="M6.2 6.6H16.3L17.8 8.5H7.7L6.2 6.6Z" fill="#9945FF" />
          </svg>
        </div>
      );
    case 'tron':
      return (
        <div className={`${className} rounded-full bg-[#EB0029] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
            <path
              d="M5.5 6.8L16.8 8.9L19.2 11.3L11.2 19.2L5.5 6.8Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M5.5 6.8L12.1 12.1L16.8 8.9" stroke="white" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M12.1 12.1L11.2 19.2" stroke="white" strokeWidth="1.3" />
            <path d="M12.1 12.1L19.2 11.3" stroke="white" strokeWidth="1.3" />
          </svg>
        </div>
      );
    case 'arbitrum':
      return (
        <div className={`${className} rounded-full bg-[#213147] border border-[#2D4363] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
            <path d="M12 4L18.5 7.75V16.25L12 20L5.5 16.25V7.75L12 4Z" stroke="#96BEDC" strokeWidth="1.4" />
            <path d="M9.5 16.2L12.5 9.2L14 12.2L11.7 16.2H9.5Z" fill="white" />
            <path d="M13.6 16.2L15.4 12.6L16.6 15L15.8 16.2H13.6Z" fill="#12AAFF" />
          </svg>
        </div>
      );
    case 'base':
      return (
        <div className={`${className} rounded-full bg-[#F5F6FA] border border-[#E6E8F0] flex items-center justify-center shrink-0`}>
          <div className="w-[42%] h-[42%] rounded-[2px] bg-[#0000FF]" />
        </div>
      );
    case 'bitcoin':
      return (
        <div className={`${className} rounded-full bg-[#F7931A] flex items-center justify-center text-white font-bold text-[15px] shrink-0`}>
          ₿
        </div>
      );
    case 'robinhood':
      return (
        <div className={`${className} rounded-full bg-[#C8F600] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
            <path
              d="M17.2 5.2C12.3 5.5 8.1 8.8 6.8 14.3L5.4 18.8L7.2 19.2L8.4 15.8C10.8 16 13.7 14.7 15.6 12.4C14.3 12.2 13.3 12.1 12.1 12.2C14.1 11 16.4 9.2 17.2 5.2Z"
              fill="#0A0B0D"
            />
            <path d="M7.5 16.2L14.2 8.8" stroke="#C8F600" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'arc':
      return (
        <div className={`${className} rounded-full bg-[#112344] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
            <path
              d="M7.2 16.8V12.2C7.2 8.9 9.4 6.5 12.2 6.5C15 6.5 16.8 8.7 16.8 12V16.8"
              stroke="white"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            <path d="M7.4 13.4H16.4" stroke="white" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'aeternity':
      return (
        <div className={`${className} rounded-full bg-[#FF2A6D] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
            <path
              d="M9.2 9.2C7.4 9.2 6.1 10.4 6.1 12C6.1 13.6 7.4 14.8 9.2 14.8C10.7 14.8 11.7 13.6 12.4 12C13.1 10.4 14.1 9.2 15.7 9.2C17.3 9.2 18.4 10.3 18.4 11.8H13.4"
              stroke="white"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12.4 12C13.1 13.6 14.1 14.8 15.7 14.8C16.8 14.8 17.7 14.3 18.2 13.5"
              stroke="white"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    case 'algorand':
      return (
        <div className={`${className} rounded-full bg-[#111217] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none">
            <path d="M6.5 17.5L11.5 6.5H13.8L15.1 10.4L17.5 17.5H15.2L13.7 12.8L11.1 17.5H8.8L12.7 10.1L12.1 8.5L8.3 17.5H6.5Z" fill="white" />
          </svg>
        </div>
      );
    case 'aptos':
      return (
        <div className={`${className} rounded-full bg-[#111217] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none">
            <path d="M6 8.5H16.5L18 6.8M6 12H18M6 15.5H14.5L16.5 17.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'avalanche':
      return (
        <div className={`${className} rounded-full bg-[#E84142] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="white">
            <path d="M12 5.5L17.8 16.5H14.2L12 12.2L9.8 16.5H6.2L12 5.5Z" />
          </svg>
        </div>
      );
    case 'bitcoincash':
      return (
        <div className={`${className} rounded-full bg-[#0AC18E] flex items-center justify-center text-white font-bold text-[15px] shrink-0`}>
          <span className="-rotate-12 inline-block">₿</span>
        </div>
      );
    case 'cardano':
      return (
        <div className={`${className} rounded-full bg-[#0033AD] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="white">
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="7.2" r="1.1" />
            <circle cx="12" cy="16.8" r="1.1" />
            <circle cx="7.8" cy="9.6" r="1.1" />
            <circle cx="16.2" cy="9.6" r="1.1" />
            <circle cx="7.8" cy="14.4" r="1.1" />
            <circle cx="16.2" cy="14.4" r="1.1" />
            <circle cx="12" cy="4.2" r="0.65" />
            <circle cx="12" cy="19.8" r="0.65" />
            <circle cx="5.2" cy="8.1" r="0.65" />
            <circle cx="18.8" cy="8.1" r="0.65" />
            <circle cx="5.2" cy="15.9" r="0.65" />
            <circle cx="18.8" cy="15.9" r="0.65" />
          </svg>
        </div>
      );
    case 'kava':
      return (
        <div className={`${className} rounded-full bg-[#FF433E] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[56%] h-[56%]" fill="white">
            <rect x="6.2" y="5.5" width="2.6" height="13" rx="0.4" />
            <path d="M10.2 12L15.4 5.5H18.4L13.1 12L18.4 18.5H15.4L10.2 12Z" />
          </svg>
        </div>
      );
    case 'litecoin':
      return (
        <div className={`${className} rounded-full bg-[#345D9D] flex items-center justify-center text-white font-bold text-[15px] shrink-0`}>
          Ł
        </div>
      );
    case 'optimism':
      return (
        <div className={`${className} rounded-full bg-[#FF0420] flex items-center justify-center text-white font-extrabold text-[11px] tracking-tight shrink-0`}>
          OP
        </div>
      );
    case 'polkadot':
      return (
        <div className={`${className} rounded-full bg-[#E6007A] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="white">
            <circle cx="12" cy="6.2" r="1.8" />
            <circle cx="12" cy="17.8" r="1.8" />
            <circle cx="6.8" cy="9.2" r="1.8" />
            <circle cx="17.2" cy="9.2" r="1.8" />
            <circle cx="6.8" cy="14.8" r="1.8" />
            <circle cx="17.2" cy="14.8" r="1.8" />
          </svg>
        </div>
      );
    case 'polygon':
      return (
        <div className={`${className} rounded-full bg-[#8247E5] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none">
            <path d="M9.5 8.5L13.5 10.8V15.2L9.5 17.5L5.5 15.2V10.8L9.5 8.5Z" stroke="white" strokeWidth="1.7" />
            <path d="M14.5 6.5L18.5 8.8V13.2L14.5 15.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'xrp':
      return (
        <div className={`${className} rounded-full bg-[#111217] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none">
            <path d="M6.5 7L10.8 11.2C11.5 11.8 12.5 11.8 13.2 11.2L17.5 7M6.5 17L10.8 12.8C11.5 12.2 12.5 12.2 13.2 12.8L17.5 17" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'xlm':
      return (
        <div className={`${className} rounded-full bg-[#111217] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none">
            <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.6" />
            <path d="M5.5 16L18.5 8" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M7.5 18L19 11" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'sui':
      return (
        <div className={`${className} rounded-full bg-[#4DA2FF] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none">
            <path d="M12 5.2C12 5.2 16.8 10.6 16.8 14.1C16.8 16.8 14.7 18.8 12 18.8C9.3 18.8 7.2 16.8 7.2 14.1C7.2 10.6 12 5.2 12 5.2Z" stroke="white" strokeWidth="2" />
          </svg>
        </div>
      );
    case 'ton':
      return (
        <div className={`${className} rounded-full bg-[#0098EA] flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none">
            <path d="M7.2 8.2H16.8L12 17.5L7.2 8.2Z" stroke="white" strokeWidth="1.9" strokeLinejoin="round" />
            <path d="M12 8.2V17.5" stroke="white" strokeWidth="1.6" />
          </svg>
        </div>
      );
    case 'viacoin':
      return (
        <div className={`${className} rounded-full bg-[#00A5E0] flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          V
        </div>
      );
    case 'zcash':
      return (
        <div className={`${className} rounded-full bg-[#F4B728] flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          ⓩ
        </div>
      );
    case 'zilliqa':
      return (
        <div className={`${className} rounded-full bg-[#49C1BF] flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          Z
        </div>
      );
    default:
      return (
        <div className={`${className} rounded-full bg-[#8247E5] flex items-center justify-center text-white font-bold text-xs shrink-0`}>
          {networkId.slice(0, 3).toUpperCase()}
        </div>
      );
  }
}

