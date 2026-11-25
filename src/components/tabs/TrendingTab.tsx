import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Star, Flame } from 'lucide-react';
import { TokenAsset } from '../../types/wallet';
import { TokenBadgeIcon } from '../icons/TrustIcons';

interface TrendingTabProps {
  tokens: TokenAsset[];
  watchlistIds: string[];
  toggleWatchlist: (id: string) => void;
  onQuickBuyToken: (tokenId: string) => void;
}

function MiniSparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 54;
  const h = 20;

  const pathD = points
    .map((pt, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((pt - min) / range) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <path
        d={pathD}
        stroke={positive ? '#16A34A' : '#DC2626'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrendingTab({
  tokens,
  watchlistIds,
  toggleWatchlist,
  onQuickBuyToken,
}: TrendingTabProps) {
  const [category, setCategory] = useState<'All' | 'Layer 1' | 'DeFi' | 'Wallet'>('All');

  const filtered = tokens
    .filter((t) => category === 'All' || t.category === category)
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-3 pb-3 border-b border-[#ECEDF0]">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#0500FF]" />
          <h2 className="text-[18px] font-bold text-[#141416] tracking-tight">
            Trending Markets
          </h2>
        </div>
        <p className="text-[12.5px] text-[#717680] mt-0.5">
          Top 24h movers across Ethereum, BSC, Solana &amp; Bitcoin
        </p>

        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto">
          {(['All', 'Layer 1', 'DeFi', 'Wallet'] as const).map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#0500FF] text-white'
                    : 'bg-[#EFEFF2] text-[#525866] hover:text-[#141416]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-[#F1F2F5]">
        {filtered.map((token, idx) => {
          const isPos = token.change24h >= 0;
          const isStarred = watchlistIds.includes(token.id);
          return (
            <div
              key={token.id}
              className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-[#F8F9FB] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-4 text-[12px] font-medium text-[#717680] tabular-nums shrink-0">
                  {idx + 1}
                </span>
                <TokenBadgeIcon
                  symbol={token.symbol}
                  networkId={token.network}
                  className="w-8 h-8"
                />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-[#141416] truncate">
                    {token.symbol}
                  </div>
                  <div className="text-[11.5px] text-[#717680] truncate">
                    MCap {token.marketCap}
                  </div>
                </div>
              </div>

              <div className="hidden sm:block shrink-0">
                <MiniSparkline points={token.sparkline} positive={isPos} />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right tabular-nums">
                  <div className="text-[13.5px] font-semibold text-[#141416]">
                    ${token.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`text-[11.5px] font-medium flex items-center justify-end gap-0.5 ${
                      isPos ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                    {isPos ? '+' : ''}
                    {token.change24h.toFixed(2)}%
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleWatchlist(token.id)}
                  aria-label={isStarred ? `Unstar ${token.symbol}` : `Star ${token.symbol}`}
                  className="p-1.5 rounded-full hover:bg-[#EFEFF2] transition-colors"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isStarred ? 'fill-[#F0B90B] text-[#F0B90B]' : 'text-[#9CA3AF]'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => onQuickBuyToken(token.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#EEF0FF] text-[#0500FF] text-[12px] font-semibold hover:bg-[#E0E4FF] transition-colors whitespace-nowrap"
                >
                  Buy
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
