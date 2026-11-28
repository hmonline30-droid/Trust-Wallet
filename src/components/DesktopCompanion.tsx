import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  Check,
  Copy,
  CreditCard,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  ActiveModal,
  ConnectedDapp,
  TokenAsset,
  WalletAccount,
  WalletTransaction,
} from '../types/wallet';
import { BinanceIcon, TokenBadgeIcon } from './icons/TrustIcons';

interface ChainSummary {
  id: string;
  name: string;
  symbol: string;
  family: string;
  treasuryAddress: string;
  requiresMemoOrTag: boolean;
  hotWalletConfigured: boolean;
  supportedTokens: string[];
}

interface DesktopCompanionProps {
  activeAccount: WalletAccount;
  tokens: TokenAsset[];
  transactions: WalletTransaction[];
  dapps: ConnectedDapp[];
  currency: 'USD' | 'EUR';
  onRefreshPayments?: () => void;
  isSyncingPayments?: boolean;
  onOpenModal: (modal: ActiveModal) => void;
  onOpenTxReceipt?: (tx: WalletTransaction) => void;
  onFundStarterPack: () => void;
  onResetEmpty: () => void;
}

export function DesktopCompanion({
  activeAccount,
  tokens,
  transactions,
  dapps,
  currency,
  onRefreshPayments,
  isSyncingPayments = false,
  onOpenModal,
  onOpenTxReceipt,
  onFundStarterPack,
  onResetEmpty,
}: DesktopCompanionProps) {
  const [panelTab, setPanelTab] = useState<'portfolio' | 'api'>('portfolio');
  const [chains, setChains] = useState<ChainSummary[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [copiedChainId, setCopiedChainId] = useState<string | null>(null);

  // Interactive API tester state
  const [apiAction, setApiAction] = useState<'verify' | 'withdraw' | 'validate'>('verify');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [txHashInput, setTxHashInput] = useState(
    '0x9c4f82e17b3a05d619e4a2b7c80f31e59d2a6c40b817f3e95a1c2d4e6f809b32'
  );
  const [addressInput, setAddressInput] = useState('0x4b8F8e6b5017eac6A6FDa7499FC935A15118E9E6');
  const [amountInput, setAmountInput] = useState('250');
  const [tokenTypeInput, setTokenTypeInput] = useState('USDT');
  const [memoInput, setMemoInput] = useState('');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [submittingApi, setSubmittingApi] = useState(false);

  const rate = currency === 'EUR' ? 0.92 : 1;
  const symbolChar = currency === 'EUR' ? '€' : '$';

  const totalPortfolioUsd = tokens.reduce(
    (sum, t) => sum + (activeAccount.balances[t.id] ?? 0) * t.priceUsd,
    0
  );
  const hasBalance = totalPortfolioUsd > 0;
  const connectedCount = dapps.filter((d) => d.connected).length;

  useEffect(() => {
    if (panelTab !== 'api' || chains.length > 0) return;
    let active = true;
    setApiLoading(true);
    fetch('/api/chains')
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data?.chains)) {
          setChains(data.chains);
        }
      })
      .catch(() => {
        // Handled cleanly in UI
      })
      .finally(() => {
        if (active) setApiLoading(false);
      });
    return () => {
      active = false;
    };
  }, [panelTab, chains.length]);

  const handleCopyTreasury = async (chainId: string, addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
    } catch {
      // Clipboard fallback
    }
    setCopiedChainId(chainId);
    setTimeout(() => setCopiedChainId((prev) => (prev === chainId ? null : prev)), 1500);
  };

  const handleRunApiAction = async () => {
    setSubmittingApi(true);
    setApiResponse(null);
    try {
      let endpoint = '/api/deposit/verify';
      let payload: Record<string, unknown> = {
        userId: 'user-101',
        network: selectedChain,
        txHash: txHashInput.trim(),
        tokenType: tokenTypeInput.trim() || undefined,
        memoOrTag: memoInput.trim() || undefined,
      };

      if (apiAction === 'withdraw') {
        endpoint = '/api/withdraw';
        payload = {
          userId: 'user-101',
          network: selectedChain,
          toAddress: addressInput.trim(),
          amount: Number(amountInput),
          tokenType: tokenTypeInput.trim() || undefined,
          memoOrTag: memoInput.trim() || undefined,
        };
      } else if (apiAction === 'validate') {
        endpoint = '/api/validate-address';
        payload = {
          network: selectedChain,
          address: addressInput.trim(),
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setApiResponse(JSON.stringify({ httpStatus: res.status, ...json }, null, 2));
    } catch (err) {
      setApiResponse(
        JSON.stringify(
          { error: err instanceof Error ? err.message : 'Request failed' },
          null,
          2
        )
      );
    } finally {
      setSubmittingApi(false);
    }
  };

  const selectedChainMeta = chains.find((c) => c.id === selectedChain);

  return (
    <aside className="hidden lg:flex flex-col gap-5 flex-1 max-w-[540px]">
      {/* Portfolio Snapshot Card */}
      <section className="bg-white rounded-[24px] border border-[#E5E7EB] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12.5px] font-medium text-[#717680]">
              {activeAccount.seedGroup} · {activeAccount.name}
            </p>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight text-[#141416] tabular-nums">
              {symbolChar}
              {(totalPortfolioUsd * rate).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="mt-2 text-[13px] text-[#717680]">
              {hasBalance
                ? 'Multi-chain self-custody balance synchronized with the wallet extension.'
                : 'Wallet is currently empty. Add funds using Receive, Binance, Buy, or the quick actions below.'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF0FF] text-[#0500FF] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex bg-[#EFEFF2] p-0.5 rounded-xl text-[12px] font-semibold">
              <button
                type="button"
                onClick={() => setPanelTab('portfolio')}
                className={`px-2.5 py-1 rounded-[10px] transition-colors ${
                  panelTab === 'portfolio'
                    ? 'bg-white text-[#141416] shadow-xs'
                    : 'text-[#717680] hover:text-[#141416]'
                }`}
              >
                Portfolio
              </button>
              <button
                type="button"
                onClick={() => setPanelTab('api')}
                className={`px-2.5 py-1 rounded-[10px] transition-colors ${
                  panelTab === 'api'
                    ? 'bg-white text-[#141416] shadow-xs'
                    : 'text-[#717680] hover:text-[#141416]'
                }`}
              >
                Chain API
              </button>
            </div>
          </div>
        </div>

        {/* Action Strip */}
        <div className="mt-5 pt-5 border-t border-[#ECEDF0] flex flex-wrap items-center gap-2">
          {hasBalance && (
            <button
              type="button"
              onClick={() => onOpenModal('send')}
              className="px-3.5 py-2 rounded-xl bg-[#EFEFF2] hover:bg-[#E4E5EA] text-[13px] font-semibold text-[#141416] flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenModal('receive')}
            className="px-3.5 py-2 rounded-xl bg-[#EFEFF2] hover:bg-[#E4E5EA] text-[13px] font-semibold text-[#141416] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Receive
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('binance')}
            className="px-3.5 py-2 rounded-xl bg-[#EFEFF2] hover:bg-[#E4E5EA] text-[13px] font-semibold text-[#141416] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <BinanceIcon className="w-4 h-4" />
            Binance
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('buy')}
            className="px-3.5 py-2 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] text-[13px] font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4" />
            Buy
          </button>

          {!hasBalance ? (
            <button
              type="button"
              onClick={onFundStarterPack}
              className="ml-auto px-3.5 py-2 rounded-xl border border-[#E5E7EB] hover:bg-[#F8F9FB] text-[12.5px] font-semibold text-[#0500FF] transition-colors whitespace-nowrap"
            >
              Load Sample Assets
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetEmpty}
              className="ml-auto px-3.5 py-2 rounded-xl border border-[#E5E7EB] hover:bg-[#F8F9FB] text-[12.5px] font-semibold text-[#717680] hover:text-[#141416] flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Empty
            </button>
          )}
        </div>
      </section>

      {panelTab === 'portfolio' ? (
        <section className="bg-white rounded-[24px] border border-[#E5E7EB] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#141416]">Market Watch</h2>
            <div className="flex items-center gap-2 text-[12px] text-[#717680]">
              <ShieldCheck className="w-4 h-4 text-[#0500FF]" />
              <span>
                {connectedCount} dApp{connectedCount === 1 ? '' : 's'} connected
              </span>
            </div>
          </div>

          <div className="divide-y divide-[#F1F2F5]">
            {[...tokens]
              .sort((a, b) => {
                const aVal = (activeAccount.balances[a.id] ?? 0) * a.priceUsd;
                const bVal = (activeAccount.balances[b.id] ?? 0) * b.priceUsd;
                return bVal - aVal;
              })
              .slice(0, 5)
              .map((token) => {
                const isPos = token.change24h >= 0;
                const bal = activeAccount.balances[token.id] ?? 0;
                return (
                  <div
                    key={token.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TokenBadgeIcon
                        symbol={token.symbol}
                        networkId={token.network}
                        className="w-8 h-8"
                      />
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold text-[#141416] truncate">
                          {token.name}
                        </div>
                        <div className="text-[12px] text-[#717680] tabular-nums">
                          {bal > 0
                            ? `${bal.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${token.symbol}`
                            : token.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <div className="text-[13.5px] font-semibold text-[#141416]">
                        {symbolChar}
                        {(token.priceUsd * rate).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div
                        className={`text-[12px] font-medium ${
                          isPos ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {isPos ? '+' : ''}
                        {token.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {transactions.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[#ECEDF0]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13.5px] font-bold text-[#141416]">Recent Activity</h3>
                <div className="flex items-center gap-2">
                  {onRefreshPayments && (
                    <button
                      type="button"
                      onClick={onRefreshPayments}
                      disabled={isSyncingPayments}
                      aria-label="Sync on-chain payments"
                      className="p-1 rounded-full hover:bg-[#F3F4F6] text-[#717680] hover:text-[#141416] transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isSyncingPayments ? 'animate-spin text-[#0500FF]' : ''}`}
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenModal('history')}
                    className="text-[12px] font-semibold text-[#0500FF] hover:underline"
                  >
                    View all ({transactions.length})
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {transactions.slice(0, 4).map((tx) => {
                  const isOutgoing = tx.amountText.startsWith('-');
                  const isPending = tx.status === 'Pending';
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => (onOpenTxReceipt ? onOpenTxReceipt(tx) : onOpenModal('history'))}
                      className="w-full flex items-center justify-between text-[12.5px] hover:bg-[#F8F9FB] rounded-lg px-1.5 py-1 -mx-1.5 transition-colors text-left"
                    >
                      <span className="text-[#525866] truncate pr-2">
                        {tx.title} ·{' '}
                        <span className={isPending ? 'text-[#D97706] font-medium' : 'text-[#9CA3AF]'}>
                          {isPending ? 'Pending' : tx.timestamp}
                        </span>
                      </span>
                      <span
                        className={`font-semibold tabular-nums shrink-0 ${
                          isPending
                            ? 'text-[#D97706]'
                            : isOutgoing
                              ? 'text-[#DC2626]'
                              : 'text-[#16A34A]'
                        }`}
                      >
                        {tx.amountText}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="bg-white rounded-[24px] border border-[#E5E7EB] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-[#141416]">
                Multi-Chain Gateway ({chains.length || 22} Networks)
              </h2>
              <p className="text-[12px] text-[#717680] mt-0.5">
                Plugin routes in <span className="font-mono">/services/chains/</span> via{' '}
                <span className="font-mono">walletController.js</span>
              </p>
            </div>
          </div>

          {/* Endpoint Tester */}
          <div className="p-3.5 rounded-2xl bg-[#F8F9FB] border border-[#ECEDF0] space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5 text-[12px] font-semibold">
              <button
                type="button"
                onClick={() => setApiAction('verify')}
                className={`py-1.5 rounded-xl transition-colors ${
                  apiAction === 'verify'
                    ? 'bg-[#0500FF] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#525866]'
                }`}
              >
                Verify Deposit
              </button>
              <button
                type="button"
                onClick={() => setApiAction('withdraw')}
                className={`py-1.5 rounded-xl transition-colors ${
                  apiAction === 'withdraw'
                    ? 'bg-[#0500FF] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#525866]'
                }`}
              >
                Withdraw
              </button>
              <button
                type="button"
                onClick={() => setApiAction('validate')}
                className={`py-1.5 rounded-xl transition-colors ${
                  apiAction === 'validate'
                    ? 'bg-[#0500FF] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#525866]'
                }`}
              >
                Validate Addr
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedChain}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedChain(next);
                  const found = chains.find((c) => c.id === next);
                  if (found) {
                    setAddressInput(found.treasuryAddress);
                    setTokenTypeInput(found.supportedTokens?.[0] ?? found.symbol);
                  }
                }}
                className="px-2.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[12.5px] font-semibold text-[#141416]"
              >
                {chains.length > 0 ? (
                  chains.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.symbol})
                    </option>
                  ))
                ) : (
                  <option value="ethereum">Ethereum (ETH)</option>
                )}
              </select>

              <input
                type="text"
                value={tokenTypeInput}
                onChange={(e) => setTokenTypeInput(e.target.value)}
                placeholder="Token (e.g. USDT)"
                className="px-2.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[12.5px] font-medium text-[#141416]"
              />
            </div>

            {apiAction === 'verify' ? (
              <input
                type="text"
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
                placeholder="Transaction hash (txHash)"
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[12px] font-mono text-[#141416]"
              />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Destination address"
                  className={`${
                    apiAction === 'withdraw' ? 'col-span-2' : 'col-span-3'
                  } px-2.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[12px] font-mono text-[#141416]`}
                />
                {apiAction === 'withdraw' && (
                  <input
                    type="number"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="Amount"
                    className="px-2.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[12.5px] font-semibold tabular-nums text-[#141416]"
                  />
                )}
              </div>
            )}

            {(selectedChainMeta?.requiresMemoOrTag || memoInput) && apiAction !== 'validate' && (
              <input
                type="text"
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                placeholder="Memo / Destination Tag (XRP, XLM, TON)"
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[12px] font-mono text-[#141416]"
              />
            )}

            <button
              type="button"
              disabled={submittingApi}
              onClick={handleRunApiAction}
              className="w-full h-9 rounded-xl bg-[#141416] hover:bg-[#27272A] disabled:opacity-60 text-white text-[12.5px] font-semibold transition-colors"
            >
              {submittingApi
                ? 'Executing...'
                : apiAction === 'verify'
                  ? 'POST /api/deposit/verify'
                  : apiAction === 'withdraw'
                    ? 'POST /api/withdraw'
                    : 'POST /api/validate-address'}
            </button>

            {apiResponse && (
              <pre className="p-2.5 rounded-xl bg-[#141416] text-[#E5E7EB] text-[11px] font-mono overflow-x-auto max-h-36">
                {apiResponse}
              </pre>
            )}
          </div>

          {/* Treasury Directory */}
          <div>
            <div className="text-[12.5px] font-bold text-[#141416] mb-2">
              Master Treasury Endpoints
            </div>
            {apiLoading ? (
              <div className="text-[12.5px] text-[#717680] py-4 text-center">
                Loading chain registry...
              </div>
            ) : (
              <div className="max-h-[190px] overflow-y-auto wallet-scroll divide-y divide-[#F1F2F5] pr-1">
                {chains.map((chain) => (
                  <div
                    key={chain.id}
                    className="py-2 flex items-center justify-between gap-2 text-[12px]"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#141416]">
                        {chain.name}{' '}
                        <span className="text-[#717680] font-normal">
                          · {chain.family}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[#717680] truncate">
                        {chain.treasuryAddress}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyTreasury(chain.id, chain.treasuryAddress)}
                      aria-label={`Copy ${chain.name} treasury address`}
                      className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#717680] hover:text-[#141416] shrink-0"
                    >
                      {copiedChainId === chain.id ? (
                        <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </aside>
  );
}
