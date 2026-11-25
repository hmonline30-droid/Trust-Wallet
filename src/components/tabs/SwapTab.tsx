import React, { useState } from 'react';
import { ArrowUpDown, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { TokenAsset, WalletAccount } from '../../types/wallet';
import { TokenBadgeIcon } from '../icons/TrustIcons';

interface SwapTabProps {
  account: WalletAccount;
  tokens: TokenAsset[];
  onExecuteSwap: (fromId: string, toId: string, fromAmount: number, toAmount: number) => void;
  onOpenBuy: () => void;
}

export function SwapTab({ account, tokens, onExecuteSwap, onOpenBuy }: SwapTabProps) {
  const [fromId, setFromId] = useState<string>('usdt');
  const [toId, setToId] = useState<string>('eth');
  const [fromAmountStr, setFromAmountStr] = useState<string>('100');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showSlippage, setShowSlippage] = useState<boolean>(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);

  const fromToken = tokens.find((t) => t.id === fromId) ?? tokens[0];
  const toToken = tokens.find((t) => t.id === toId) ?? tokens[1];

  const fromBalance = account.balances[fromToken.id] ?? 0;
  const toBalance = account.balances[toToken.id] ?? 0;

  const parsedFrom = Math.max(0, parseFloat(fromAmountStr) || 0);
  const rate = fromToken.priceUsd / toToken.priceUsd;
  const estimatedTo = parsedFrom * rate * 0.997; // 0.3% dex fee
  const insufficientBalance = parsedFrom > fromBalance || parsedFrom <= 0;

  const handleFlip = () => {
    setFromId(toId);
    setToId(fromId);
    setSwapSuccess(null);
  };

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (insufficientBalance) return;
    onExecuteSwap(fromToken.id, toToken.id, parsedFrom, estimatedTo);
    setSwapSuccess(`Swapped ${parsedFrom} ${fromToken.symbol} → ${estimatedTo.toFixed(5)} ${toToken.symbol}`);
    setFromAmountStr('');
  };

  return (
    <div className="p-4 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#141416] tracking-tight">Swap</h2>
          <p className="text-[12px] text-[#717680]">Cross-chain DEX aggregator</p>
        </div>
        <button
          type="button"
          onClick={() => setShowSlippage((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EFEFF2] hover:bg-[#E5E6EB] text-[12px] font-semibold text-[#141416] transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="tabular-nums">{slippage}%</span>
        </button>
      </div>

      {showSlippage && (
        <div className="mb-3 p-3 rounded-2xl bg-[#F7F8FA] border border-[#ECEDF0] flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-[#525866]">Max Slippage</span>
          <div className="flex items-center gap-1.5">
            {[0.1, 0.5, 1.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setSlippage(val)}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold tabular-nums transition-colors ${
                  slippage === val
                    ? 'bg-[#0500FF] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#141416]'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSwapSubmit} className="space-y-2 relative">
        {/* From Card */}
        <div className="p-3.5 rounded-2xl bg-[#F4F5F8] border border-[#ECEDF0]">
          <div className="flex items-center justify-between text-[12px] text-[#717680] mb-2">
            <span>From</span>
            <button
              type="button"
              onClick={() => setFromAmountStr(fromBalance > 0 ? String(fromBalance) : '0')}
              className="tabular-nums hover:text-[#0500FF] transition-colors"
            >
              Balance: {fromBalance.toLocaleString('en-US', { maximumFractionDigits: 5 })} {fromToken.symbol}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 shrink-0">
              <TokenBadgeIcon
                symbol={fromToken.symbol}
                networkId={fromToken.network}
                className="w-6 h-6"
              />
              <select
                value={fromId}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === toId) setToId(fromId);
                  setFromId(next);
                  setSwapSuccess(null);
                }}
                aria-label="Select source token"
                className="text-[14px] font-bold text-[#141416] bg-transparent focus:outline-none cursor-pointer"
              >
                {tokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id === 'usdt-trc20' ? 'USDT (TRX)' : t.symbol}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="number"
              step="any"
              min="0"
              value={fromAmountStr}
              onChange={(e) => {
                setFromAmountStr(e.target.value);
                setSwapSuccess(null);
              }}
              placeholder="0.00"
              className="w-full text-right text-[22px] font-bold text-[#141416] bg-transparent focus:outline-none tabular-nums"
            />
          </div>
          <div className="text-right text-[11.5px] text-[#717680] mt-1 tabular-nums">
            ≈ ${(parsedFrom * fromToken.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Flip Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            type="button"
            onClick={handleFlip}
            aria-label="Switch swap direction"
            className="w-9 h-9 rounded-full bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center text-[#141416] hover:text-[#0500FF] hover:border-[#0500FF]/40 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* To Card */}
        <div className="p-3.5 rounded-2xl bg-[#F4F5F8] border border-[#ECEDF0]">
          <div className="flex items-center justify-between text-[12px] text-[#717680] mb-2">
            <span>To (estimated)</span>
            <span className="tabular-nums">
              Balance: {toBalance.toLocaleString('en-US', { maximumFractionDigits: 5 })} {toToken.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 shrink-0">
              <TokenBadgeIcon
                symbol={toToken.symbol}
                networkId={toToken.network}
                className="w-6 h-6"
              />
              <select
                value={toId}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === fromId) setFromId(toId);
                  setToId(next);
                  setSwapSuccess(null);
                }}
                aria-label="Select destination token"
                className="text-[14px] font-bold text-[#141416] bg-transparent focus:outline-none cursor-pointer"
              >
                {tokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id === 'usdt-trc20' ? 'USDT (TRX)' : t.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right text-[22px] font-bold text-[#141416] tabular-nums truncate">
              {estimatedTo > 0 ? estimatedTo.toFixed(5) : '0.00'}
            </div>
          </div>
          <div className="text-right text-[11.5px] text-[#717680] mt-1 tabular-nums">
            1 {fromToken.symbol} = {rate.toFixed(5)} {toToken.symbol}
          </div>
        </div>

        {swapSuccess && (
          <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[12.5px] font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{swapSuccess}</span>
          </div>
        )}

        <div className="pt-2">
          {fromBalance <= 0 ? (
            <button
              type="button"
              onClick={onOpenBuy}
              className="w-full h-12 rounded-2xl bg-[#0500FF] hover:bg-[#0400D6] text-white text-[14px] font-semibold transition-colors"
            >
              Add {fromToken.symbol} to Swap
            </button>
          ) : (
            <button
              type="submit"
              disabled={insufficientBalance}
              className="w-full h-12 rounded-2xl bg-[#0500FF] hover:bg-[#0400D6] disabled:bg-[#D1D5DB] disabled:text-[#6B7280] text-white text-[14px] font-semibold transition-colors"
            >
              {parsedFrom > fromBalance
                ? `Insufficient ${fromToken.symbol} balance`
                : `Swap ${fromToken.symbol} to ${toToken.symbol}`}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
