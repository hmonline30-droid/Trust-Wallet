import React from 'react';
import {
  CreditCard,
  Globe,
  QrCode,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Send,
} from 'lucide-react';
import {
  ActiveModal,
  HomeSubTab,
  NetworkId,
  TokenApproval,
  TokenAsset,
  WalletAccount,
  WalletTransaction,
} from '../../types/wallet';
import { NETWORKS } from '../../data/walletData';
import { BinanceIcon, TokenBadgeIcon, UfoEmptyIllustration } from '../icons/TrustIcons';

interface HomeTabProps {
  account: WalletAccount;
  tokens: TokenAsset[];
  transactions: WalletTransaction[];
  homeSubTab: HomeSubTab;
  setHomeSubTab: (tab: HomeSubTab) => void;
  selectedNetwork: NetworkId;
  watchlistIds: string[];
  toggleWatchlist: (id: string) => void;
  approvals: TokenApproval[];
  onRevokeApproval: (id: string) => void;
  onOpenModal: (modal: ActiveModal) => void;
  onOpenTxReceipt: (tx: WalletTransaction) => void;
  onRefreshPayments: () => void;
  isSyncingPayments?: boolean;
  onSelectToken: (tokenId: string) => void;
  onQuickBuyToken: (tokenId: string) => void;
  onResetEmpty: () => void;
  currency?: 'USD' | 'EUR';
}

export function HomeTab({
  account,
  tokens,
  transactions,
  homeSubTab,
  setHomeSubTab,
  selectedNetwork,
  watchlistIds,
  toggleWatchlist,
  approvals,
  onRevokeApproval,
  onOpenModal,
  onOpenTxReceipt,
  onRefreshPayments,
  isSyncingPayments = false,
  onSelectToken,
  onQuickBuyToken,
  currency = 'USD',
}: HomeTabProps) {
  const rate = currency === 'EUR' ? 0.92 : 1;
  const symbolChar = currency === 'EUR' ? '€' : '$';
  const totalBalanceUsd = tokens.reduce((sum, token) => {
    const qty = account.balances[token.id] ?? 0;
    return sum + qty * token.priceUsd;
  }, 0);

  const weightedChange24h =
    totalBalanceUsd > 0
      ? tokens.reduce((sum, token) => {
          const qty = account.balances[token.id] ?? 0;
          return sum + qty * token.priceUsd * token.change24h;
        }, 0) / totalBalanceUsd
      : 0;
  const isPortfolioPos = weightedChange24h >= 0;

  const hasAnyBalance = Object.values(account.balances).some((amt) => amt > 0);

  const visibleTokens = tokens
    .filter((t) => {
      const matchesNetwork = selectedNetwork === 'all' || t.network === selectedNetwork;
      const isEnabled = account.enabledTokenIds.includes(t.id) || (account.balances[t.id] ?? 0) > 0;
      return matchesNetwork && isEnabled;
    })
    .sort((a, b) => {
      const aVal = (account.balances[a.id] ?? 0) * a.priceUsd;
      const bVal = (account.balances[b.id] ?? 0) * b.priceUsd;
      return bVal - aVal;
    });

  const watchlistTokens = tokens.filter((t) => {
    const matchesNetwork = selectedNetwork === 'all' || t.network === selectedNetwork;
    return matchesNetwork && watchlistIds.includes(t.id);
  });

  const visibleApprovals = approvals.filter(
    (a) => selectedNetwork === 'all' || a.network === selectedNetwork
  );

  const activeNetworkLabel =
    selectedNetwork === 'all'
      ? null
      : NETWORKS.find((n) => n.id === selectedNetwork)?.name ?? null;

  return (
    <div className="flex flex-col flex-1">
      {/* Hero / Balance Area */}
      <div className="px-4 pt-3 pb-4">
        {!hasAnyBalance ? (
          <h1 className="text-[23px] leading-[1.22] font-bold tracking-[-0.02em] text-[#141416] dark:text-[#F4F5F7] text-balance mb-4">
            Get started by adding some crypto
          </h1>
        ) : (
          <div className="mb-4">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[31px] leading-tight font-bold tracking-[-0.025em] text-[#141416] dark:text-[#F4F5F7] tabular-nums">
                {symbolChar}
                {(totalBalanceUsd * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span
                className={`text-[12px] font-medium tabular-nums ${
                  isPortfolioPos ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'
                }`}
              >
                {isPortfolioPos ? '+' : ''}
                {weightedChange24h.toFixed(2)}% today
              </span>
            </div>
            <p className="text-[12px] text-[#717680] dark:text-[#8E95A5] mt-0.5">
              Total multi-chain portfolio value
            </p>
          </div>
        )}

        {/* Quick Action Tiles */}
        {hasAnyBalance ? (
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onOpenModal('send')}
              className="group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0500FF] rounded-2xl"
            >
              <div className="w-full h-[58px] rounded-[16px] bg-[#EFEFF2] dark:bg-[#1C202B] group-hover:bg-[#E5E6EB] dark:group-hover:bg-[#252A38] active:scale-[0.98] transition-all flex items-center justify-center">
                <Send className="w-[20px] h-[20px] text-[#141416] dark:text-[#F4F5F7]" strokeWidth={2} />
              </div>
              <span className="mt-1.5 text-[12px] font-medium text-[#141416] dark:text-[#F4F5F7] text-center">
                Send
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('receive')}
              className="group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0500FF] rounded-2xl"
            >
              <div className="w-full h-[58px] rounded-[16px] bg-[#EFEFF2] dark:bg-[#1C202B] group-hover:bg-[#E5E6EB] dark:group-hover:bg-[#252A38] active:scale-[0.98] transition-all flex items-center justify-center">
                <QrCode className="w-[20px] h-[20px] text-[#141416] dark:text-[#F4F5F7]" strokeWidth={2} />
              </div>
              <span className="mt-1.5 text-[12px] font-medium text-[#141416] dark:text-[#F4F5F7] text-center">
                Receive
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('binance')}
              className="group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0500FF] rounded-2xl"
            >
              <div className="w-full h-[58px] rounded-[16px] bg-[#EFEFF2] dark:bg-[#1C202B] group-hover:bg-[#E5E6EB] dark:group-hover:bg-[#252A38] active:scale-[0.98] transition-all flex items-center justify-center">
                <BinanceIcon className="w-[22px] h-[22px]" />
              </div>
              <span className="mt-1.5 text-[12px] font-medium text-[#141416] dark:text-[#F4F5F7] text-center">
                Binance
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('buy')}
              className="group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0500FF] rounded-2xl"
            >
              <div className="w-full h-[58px] rounded-[16px] bg-[#EFEFF2] dark:bg-[#1C202B] group-hover:bg-[#E5E6EB] dark:group-hover:bg-[#252A38] active:scale-[0.98] transition-all flex items-center justify-center">
                <CreditCard className="w-[20px] h-[20px] text-[#141416] dark:text-[#F4F5F7]" strokeWidth={2} />
              </div>
              <span className="mt-1.5 text-[12px] font-medium text-[#141416] dark:text-[#F4F5F7] text-center">
                Buy
              </span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenModal('receive')}
              className="group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0500FF] rounded-2xl"
            >
              <div className="w-full h-[64px] rounded-[16px] bg-[#EFEFF2] dark:bg-[#1C202B] group-hover:bg-[#E5E6EB] dark:group-hover:bg-[#252A38] active:scale-[0.98] transition-all flex items-center justify-center">
                <QrCode className="w-[22px] h-[22px] text-[#141416] dark:text-[#F4F5F7]" strokeWidth={2} />
              </div>
              <span className="mt-2 text-[12.5px] font-medium leading-[1.25] text-[#141416] dark:text-[#F4F5F7] text-center">
                Receive
                <br />
                crypto
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('binance')}
              className="group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0500FF] rounded-2xl"
            >
              <div className="w-full h-[64px] rounded-[16px] bg-[#EFEFF2] dark:bg-[#1C202B] group-hover:bg-[#E5E6EB] dark:group-hover:bg-[#252A38] active:scale-[0.98] transition-all flex items-center justify-center">
                <BinanceIcon className="w-[24px] h-[24px]" />
              </div>
              <span className="mt-2 text-[12.5px] font-medium leading-[1.25] text-[#141416] dark:text-[#F4F5F7] text-center">
                Deposit from
                <br />
                Binance
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('buy')}
              className="group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0500FF] rounded-2xl"
            >
              <div className="w-full h-[64px] rounded-[16px] bg-[#EFEFF2] dark:bg-[#1C202B] group-hover:bg-[#E5E6EB] dark:group-hover:bg-[#252A38] active:scale-[0.98] transition-all flex items-center justify-center">
                <CreditCard className="w-[22px] h-[22px] text-[#141416] dark:text-[#F4F5F7]" strokeWidth={2} />
              </div>
              <span className="mt-2 text-[12.5px] font-medium leading-[1.25] text-[#141416] dark:text-[#F4F5F7] text-center">
                Buy
                <br />
                crypto
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-Tabs Bar: Tokens | Watchlist | Approvals  +  Globe & Sliders */}
      <div className="px-4 flex items-center justify-between border-b border-[#ECEDF0] dark:border-[#232836]">
        <div className="flex items-center gap-5" role="tablist" aria-label="Wallet sections">
          {(
            [
              { id: 'tokens', label: 'Tokens' },
              { id: 'watchlist', label: 'Watchlist' },
              { id: 'approvals', label: 'Approvals' },
            ] as const
          ).map((tab) => {
            const active = homeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setHomeSubTab(tab.id)}
                className={`relative py-2.5 text-[14px] whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:text-[#0500FF] ${
                  active
                    ? 'font-semibold text-[#141416] dark:text-[#F4F5F7]'
                    : 'font-medium text-[#7B808C] dark:text-[#8E95A5] hover:text-[#141416] dark:hover:text-[#F4F5F7]'
                }`}
              >
                {tab.label}
                {active && (
                  <span
                    className="absolute left-0 right-0 -bottom-[1px] h-[2.5px] rounded-full bg-[#0500FF] dark:bg-[#6B85FF]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onOpenModal('networks')}
            title={activeNetworkLabel ? `Network: ${activeNetworkLabel}` : 'Filter by network'}
            aria-label="Filter by network"
            className={`min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center transition-colors ${
              selectedNetwork !== 'all'
                ? 'text-[#0500FF] dark:text-[#6B85FF] bg-[#EEF0FF] dark:bg-[#1E2747]'
                : 'text-[#141416] dark:text-[#F4F5F7] hover:bg-[#F3F4F6] dark:hover:bg-[#1C202B]'
            }`}
          >
            <Globe className="w-[18px] h-[18px]" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('manage')}
            title="Manage crypto"
            aria-label="Manage crypto tokens"
            className="min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-[#141416] dark:text-[#F4F5F7] hover:bg-[#F3F4F6] dark:hover:bg-[#1C202B] transition-colors"
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={1.9} />
          </button>
        </div>
      </div>

      {/* Active Network Filter Strip (only shown when filtered) */}
      {activeNetworkLabel && (
        <div className="px-4 py-1.5 bg-[#F7F8FA] dark:bg-[#1A1E29] border-b border-[#ECEDF0] dark:border-[#232836] flex items-center justify-between text-[12px]">
          <span className="text-[#717680] dark:text-[#8E95A5]">
            Network: <strong className="text-[#141416] dark:text-[#F4F5F7] font-medium">{activeNetworkLabel}</strong>
          </span>
          <button
            type="button"
            onClick={() => onOpenModal('networks')}
            className="text-[#0500FF] dark:text-[#6B85FF] font-medium hover:underline"
          >
            Change
          </button>
        </div>
      )}

      {/* Tab Panel Body */}
      <div className="flex-1 flex flex-col">
        {homeSubTab === 'tokens' && (
          <>
            {hasAnyBalance && transactions.length > 0 && (() => {
              const latestTx = transactions[0];
              const isOutgoing = latestTx.amountText.startsWith('-');
              const isPending = latestTx.status === 'Pending';
              return (
                <div className="px-4 pt-3 pb-1">
                  <div className="rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-[#FAFAFC] dark:bg-[#1A1E29] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11.5px] font-semibold text-[#717680] dark:text-[#8E95A5]">
                        Recent Payment
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onRefreshPayments}
                          aria-label="Sync on-chain payments"
                          className="p-1 rounded-full hover:bg-[#EFEFF2] dark:hover:bg-[#252A38] text-[#717680] dark:text-[#8E95A5] hover:text-[#141416] dark:hover:text-[#F4F5F7] transition-colors"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isSyncingPayments ? 'animate-spin text-[#0500FF] dark:text-[#6B85FF]' : ''}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenModal('history')}
                          className="text-[11.5px] font-semibold text-[#0500FF] dark:text-[#6B85FF] hover:underline"
                        >
                          History ({transactions.length})
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenTxReceipt(latestTx)}
                      className="w-full flex items-center justify-between gap-2.5 text-left rounded-xl hover:bg-[#F2F4F8] dark:hover:bg-[#222736] p-1 -m-1 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isPending
                              ? 'bg-[#FEF3C7] dark:bg-[#422006] text-[#D97706] dark:text-[#FBBF24]'
                              : isOutgoing
                                ? 'bg-[#FEF2F2] dark:bg-[#450A0A] text-[#DC2626] dark:text-[#F87171]'
                                : 'bg-[#ECFDF5] dark:bg-[#052E16] text-[#16A34A] dark:text-[#4ADE80]'
                          }`}
                        >
                          {isPending ? (
                            <Clock className="w-4 h-4" />
                          ) : isOutgoing ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#141416] dark:text-[#F4F5F7] truncate">
                            {latestTx.title}
                          </div>
                          <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5] truncate">
                            {latestTx.subtitle} · {latestTx.timestamp}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div
                          className={`text-[13px] font-semibold ${
                            isPending
                              ? 'text-[#D97706] dark:text-[#FBBF24]'
                              : isOutgoing
                                ? 'text-[#DC2626] dark:text-[#F87171]'
                                : 'text-[#16A34A] dark:text-[#4ADE80]'
                          }`}
                        >
                          {latestTx.amountText}
                        </div>
                        <div className="text-[11px] text-[#717680] dark:text-[#8E95A5]">{latestTx.usdText}</div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })()}

            {!hasAnyBalance ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
                <UfoEmptyIllustration className="w-[172px] h-[156px] mb-1" />
                <p className="text-[15px] font-medium text-[#141416] dark:text-[#F4F5F7] tracking-[-0.01em]">
                  Your wallet is empty
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F2F5] dark:divide-[#232836]">
                {visibleTokens.map((token) => {
                  const qty = account.balances[token.id] ?? 0;
                  const valueUsd = qty * token.priceUsd;
                  const net = NETWORKS.find((n) => n.id === token.network);
                  const isPos = token.change24h >= 0;

                  return (
                    <button
                      key={token.id}
                      type="button"
                      onClick={() => onSelectToken(token.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#F8F9FB] dark:hover:bg-[#1C202B] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <TokenBadgeIcon
                          symbol={token.symbol}
                          networkId={token.network}
                          className="w-9 h-9"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-semibold text-[#141416] dark:text-[#F4F5F7] truncate">
                              {token.symbol}
                            </span>
                            <span className="text-[11px] text-[#717680] dark:text-[#8E95A5] truncate">
                              {net?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] text-[#717680] dark:text-[#8E95A5] tabular-nums">
                            <span>
                              {symbolChar}
                              {(token.priceUsd * rate).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={isPos ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'}>
                              {isPos ? '+' : ''}
                              {token.change24h.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3 tabular-nums">
                        <div className="text-[14px] font-semibold text-[#141416] dark:text-[#F4F5F7]">
                          {qty > 0 ? qty.toLocaleString('en-US', { maximumFractionDigits: 5 }) : '0'}
                        </div>
                        <div className="text-[12px] text-[#717680] dark:text-[#8E95A5]">
                          {symbolChar}
                          {(valueUsd * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {visibleTokens.length === 0 && (
                  <div className="py-12 px-4 text-center text-[13px] text-[#717680] dark:text-[#8E95A5]">
                    No enabled tokens match the selected network.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {homeSubTab === 'watchlist' && (
          <div className="divide-y divide-[#F1F2F5] dark:divide-[#232836]">
            {watchlistTokens.length === 0 ? (
              <div className="py-14 px-6 text-center">
                <p className="text-[14px] font-medium text-[#141416] dark:text-[#F4F5F7]">No watchlisted tokens</p>
                <p className="text-[12.5px] text-[#717680] dark:text-[#8E95A5] mt-1">
                  Star any token in Trending or Search to track prices here.
                </p>
              </div>
            ) : (
              watchlistTokens.map((token) => {
                const isPos = token.change24h >= 0;
                return (
                  <div
                    key={token.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-[#F8F9FB] dark:hover:bg-[#1C202B] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TokenBadgeIcon
                        symbol={token.symbol}
                        networkId={token.network}
                        className="w-9 h-9"
                      />
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#141416] dark:text-[#F4F5F7] truncate">
                          {token.name}
                        </div>
                        <div className="text-[12px] text-[#717680] dark:text-[#8E95A5]">{token.symbol}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right tabular-nums">
                        <div className="text-[14px] font-semibold text-[#141416] dark:text-[#F4F5F7]">
                          {symbolChar}
                          {(token.priceUsd * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div
                          className={`text-[12px] font-medium flex items-center justify-end gap-0.5 ${
                            isPos ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'
                          }`}
                        >
                          {isPos ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3" />
                          )}
                          {isPos ? '+' : ''}
                          {token.change24h.toFixed(2)}%
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onQuickBuyToken(token.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#EEF0FF] dark:bg-[#1E2747] text-[#0500FF] dark:text-[#8FA4FF] text-[12px] font-semibold hover:bg-[#E0E4FF] dark:hover:bg-[#27335D] transition-colors whitespace-nowrap"
                      >
                        Buy
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleWatchlist(token.id)}
                        aria-label={`Remove ${token.symbol} from watchlist`}
                        className="p-1.5 text-[#F0B90B] hover:bg-[#F3F4F6] dark:hover:bg-[#1C202B] rounded-full transition-colors"
                      >
                        <Star className="w-4 h-4 fill-[#F0B90B]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {homeSubTab === 'approvals' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#141416] dark:text-[#F4F5F7]">
                <ShieldCheck className="w-4 h-4 text-[#0500FF] dark:text-[#6B85FF]" />
                <span>Active Smart Contract Allowances</span>
              </div>
              <span className="text-[12px] text-[#717680] dark:text-[#8E95A5] tabular-nums">
                {visibleApprovals.length} active
              </span>
            </div>

            {visibleApprovals.length === 0 ? (
              <div className="py-10 px-4 text-center border border-[#ECEDF0] dark:border-[#232836] rounded-2xl bg-[#FAFAFC] dark:bg-[#1A1E29]">
                <p className="text-[14px] font-medium text-[#141416] dark:text-[#F4F5F7]">All clear — no active approvals</p>
                <p className="text-[12px] text-[#717680] dark:text-[#8E95A5] mt-1">
                  Token spending permissions granted to dApps appear here so you can revoke them anytime.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleApprovals.map((item) => {
                  const net = NETWORKS.find((n) => n.id === item.network);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#1A1E29] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7] truncate">
                          {item.spenderName}
                        </div>
                        <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5] mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono">{item.spenderAddress}</span>
                          <span aria-hidden="true">·</span>
                          <span>{net?.shortName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{item.allowance}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRevokeApproval(item.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#FEE2E2] dark:bg-[#450A0A] text-[#B91C1C] dark:text-[#FCA5A5] hover:bg-[#FECACA] dark:hover:bg-[#7F1D1D] text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
