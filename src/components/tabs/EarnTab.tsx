import React, { useState } from 'react';
import { Sprout, CheckCircle2, AlertCircle } from 'lucide-react';
import { EarnVault, WalletAccount } from '../../types/wallet';
import { EARN_VAULTS } from '../../data/walletData';
import { TokenBadgeIcon } from '../icons/TrustIcons';

interface EarnTabProps {
  account: WalletAccount;
  onStake: (symbol: string, amount: number) => void;
  onOpenBuy: () => void;
}

export function EarnTab({ account, onStake, onOpenBuy }: EarnTabProps) {
  const [selectedVault, setSelectedVault] = useState<EarnVault | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [stakedMessage, setStakedMessage] = useState<string | null>(null);

  const selectedBal = selectedVault
    ? account.balances[selectedVault.symbol.toLowerCase()] ?? 0
    : 0;
  const parsedAmt = parseFloat(stakeAmount);
  const isValidAmt =
    !!selectedVault &&
    Number.isFinite(parsedAmt) &&
    parsedAmt >= selectedVault.minStake &&
    parsedAmt <= selectedBal;

  const validationError =
    selectedVault && stakeAmount.trim() !== ''
      ? !Number.isFinite(parsedAmt) || parsedAmt <= 0
        ? 'Enter a valid positive amount.'
        : parsedAmt < selectedVault.minStake
          ? `Minimum stake is ${selectedVault.minStake} ${selectedVault.symbol}.`
          : parsedAmt > selectedBal
            ? `Exceeds available ${selectedVault.symbol} balance.`
            : null
      : null;

  const handleConfirmStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVault || !isValidAmt) return;
    onStake(selectedVault.symbol, parsedAmt);
    setStakedMessage(`Staked ${parsedAmt} ${selectedVault.symbol} at ${selectedVault.apy}% APR`);
    setSelectedVault(null);
    setStakeAmount('');
  };

  return (
    <div className="p-4 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-[#0500FF] dark:text-[#6B85FF]" />
            <h2 className="text-[18px] font-bold text-[#141416] dark:text-[#F4F5F7] tracking-tight">
              Native Staking &amp; Earn
            </h2>
          </div>
          <p className="text-[12.5px] text-[#717680] dark:text-[#8E95A5] mt-0.5">
            Put your assets to work with self-custody validators
          </p>
        </div>
      </div>

      {stakedMessage && (
        <div className="mb-3 p-3 rounded-xl bg-[#ECFDF5] dark:bg-[#052E16] border border-[#A7F3D0] dark:border-[#166534] text-[#065F46] dark:text-[#86EFAC] text-[12.5px] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{stakedMessage}</span>
        </div>
      )}

      {selectedVault ? (
        <form
          onSubmit={handleConfirmStake}
          className="p-4 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-[#F8F9FB] dark:bg-[#1A1E29] space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TokenBadgeIcon
                symbol={selectedVault.symbol}
                networkId={selectedVault.network}
                className="w-8 h-8"
              />
              <div>
                <div className="text-[14px] font-bold text-[#141416] dark:text-[#F4F5F7]">{selectedVault.name}</div>
                <div className="text-[12px] text-[#16A34A] dark:text-[#4ADE80] font-semibold tabular-nums">
                  {selectedVault.apy}% APR ·{' '}
                  {selectedVault.lockDays === 0 ? 'Flexible' : `${selectedVault.lockDays}d lock`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedVault(null);
                setStakeAmount('');
              }}
              className="text-[12px] font-semibold text-[#717680] dark:text-[#8E95A5] hover:text-[#141416] dark:hover:text-[#F4F5F7]"
            >
              Cancel
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between text-[12px] text-[#717680] dark:text-[#8E95A5] mb-1">
              <span>Amount ({selectedVault.symbol})</span>
              <button
                type="button"
                onClick={() => selectedBal > 0 && setStakeAmount(String(selectedBal))}
                className="tabular-nums hover:text-[#0500FF] dark:hover:text-[#6B85FF] transition-colors"
              >
                Available: {selectedBal.toFixed(4)}
              </button>
            </div>
            <input
              type="number"
              step="any"
              min={selectedVault.minStake}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder={`Min ${selectedVault.minStake} ${selectedVault.symbol}`}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#14171F] border border-[#E5E7EB] dark:border-[#2D3343] text-[15px] font-semibold text-[#141416] dark:text-[#F4F5F7] focus:outline-none focus:border-[#0500FF] tabular-nums"
            />
            {validationError && (
              <div className="mt-1.5 flex items-center gap-1 text-[11.5px] text-[#DC2626] dark:text-[#F87171]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {selectedBal <= 0 ? (
            <button
              type="button"
              onClick={onOpenBuy}
              className="w-full h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] text-white text-[13.5px] font-semibold transition-colors"
            >
              Buy or Deposit {selectedVault.symbol} First
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isValidAmt}
              className="w-full h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] disabled:bg-[#D1D5DB] dark:disabled:bg-[#232836] disabled:text-[#6B7280] dark:disabled:text-[#64748B] text-white text-[13.5px] font-semibold transition-colors"
            >
              Confirm Stake
            </button>
          )}
        </form>
      ) : (
        <div className="space-y-2.5">
          {EARN_VAULTS.map((vault) => {
            const bal = account.balances[vault.symbol.toLowerCase()] ?? 0;
            return (
              <button
                key={vault.id}
                type="button"
                onClick={() => {
                  setSelectedVault(vault);
                  setStakedMessage(null);
                  setStakeAmount('');
                }}
                className="w-full p-3.5 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#1A1E29] hover:bg-[#F8F9FB] dark:hover:bg-[#222736] transition-colors flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TokenBadgeIcon
                    symbol={vault.symbol}
                    networkId={vault.network}
                    className="w-9 h-9"
                  />
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-[#141416] dark:text-[#F4F5F7] truncate">
                      {vault.symbol} Staking
                    </div>
                    <div className="text-[12px] text-[#717680] dark:text-[#8E95A5] truncate">
                      {vault.validator} ·{' '}
                      {vault.lockDays === 0 ? 'Flexible' : `${vault.lockDays}d unbonding`}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2 tabular-nums">
                  <div className="text-[14px] font-bold text-[#16A34A] dark:text-[#4ADE80]">
                    {vault.apy.toFixed(2)}% APR
                  </div>
                  <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5]">
                    {bal > 0 ? `${bal.toFixed(3)} avail.` : '0 avail.'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
