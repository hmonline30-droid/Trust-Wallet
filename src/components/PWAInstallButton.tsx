import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'card' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    if (variant === 'card') {
      return (
        <button
          type="button"
          onClick={install}
          className="w-full h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Install Android / Desktop App
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={install}
        title="Install Trust Wallet App"
        className="px-2.5 h-7 rounded-lg bg-[#0500FF] hover:bg-[#0400D6] text-white text-[11.5px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5" />
        Install
      </button>
    );
  }

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="w-full h-11 rounded-xl bg-[#EEF0FF] dark:bg-[#1E2747] hover:bg-[#E0E4FF] dark:hover:bg-[#27335D] text-[#0500FF] dark:text-[#8FA4FF] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Smartphone className="w-4 h-4" />
          {isIOS ? 'Install on iPhone / iPad' : 'Install as Android App (WebAPK)'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          title="Install Mobile App"
          aria-label="Install Mobile App"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#0500FF] dark:text-[#6B85FF] hover:bg-[#EEF0FF] dark:hover:bg-[#1E2747] transition-colors"
        >
          <Download className="w-[16px] h-[16px]" strokeWidth={2} />
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#14171F] p-5 shadow-2xl border border-[#E5E7EB] dark:border-[#232836]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[16px] font-bold text-[#141416] dark:text-[#F4F5F7]">
                {isIOS ? 'Install on iPhone / iPad' : 'Install Android App / Export APK'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="w-7 h-7 rounded-full bg-[#EFEFF2] dark:bg-[#1C202B] flex items-center justify-center text-[#141416] dark:text-[#F4F5F7]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="text-[13px] text-[#525866] dark:text-[#9CA3AF] space-y-2 list-decimal pl-4">
                <li>
                  Open this URL in <strong>Safari</strong> on iPhone or iPad.
                </li>
                <li>
                  Tap the <strong>Share</strong> icon in the bottom toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
              </ol>
            ) : (
              <div className="text-[13px] text-[#525866] dark:text-[#9CA3AF] space-y-2.5">
                <p>
                  <strong className="text-[#141416] dark:text-[#F4F5F7]">1. Direct Android Install (WebAPK):</strong>{' '}
                  Open the app URL in Chrome on Android, tap the <strong>⋮</strong> menu, and
                  choose <strong>Add to Home screen → Install app</strong>.
                </p>
                <p>
                  <strong className="text-[#141416] dark:text-[#F4F5F7]">2. Signed .APK File:</strong> Copy the live
                  Shared App URL into{' '}
                  <span className="font-mono text-[#0500FF] dark:text-[#6B85FF]">pwabuilder.com</span> and choose{' '}
                  <strong>Package for Android</strong> to download an installable{' '}
                  <span className="font-mono">.apk</span>.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full h-10 rounded-xl bg-[#141416] dark:bg-[#0500FF] hover:bg-[#27272A] dark:hover:bg-[#0400D6] text-white text-[13px] font-semibold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      Offline Mode — Cached wallet data active
    </div>
  );
};
