import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { AdminSession, TokenAsset, WalletAccount } from '../types/wallet';

interface AdminOverview {
  stats: {
    supportedChains: number;
    hotWalletsReady: number;
    activeSessions: number;
    trackedEvents: number;
  };
}

interface AdminPanelProps {
  adminToken: string | null;
  adminSession: AdminSession | null;
  onAuthChange: (token: string | null, session: AdminSession | null) => void;
  activeAccount: WalletAccount;
  tokens: TokenAsset[];
  onCreditAsset: (
    tokenId: string,
    amount: number,
    source: 'receive' | 'deposit' | 'buy',
    label: string,
    customMeta?: { txHash?: string; counterparty?: string }
  ) => void;
  onResetAccountEmpty: () => void;
  onNotify?: (msg: string) => void;
}

export function AdminPanel({
  adminToken,
  adminSession,
  onAuthChange,
  activeAccount,
  tokens,
  onCreditAsset,
  onResetAccountEmpty,
  onNotify,
}: AdminPanelProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [envConfigured, setEnvConfigured] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('admin@trustwallet.local');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  // Admin credit controls
  const [creditTokenId, setCreditTokenId] = useState<string>(tokens[1]?.id || 'eth');
  const [creditAmount, setCreditAmount] = useState<string>('10');
  const [creditFromAddr, setCreditFromAddr] = useState<string>(
    '0x4b8F8e6b5017eac6A6FDa7499FC935A15118E9E6'
  );
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
      const res = await fetch('/api/admin/status', { headers });
      const data = await res.json();
      if (data?.ok) {
        setConfigured(Boolean(data.configured));
        setEnvConfigured(Boolean(data.envConfigured));
        if (data.defaultEmail) {
          setEmailInput((prev) => prev || data.defaultEmail);
        }
        if (!data.authenticated && adminToken) {
          onAuthChange(null, null);
        } else if (data.authenticated && data.admin && !adminSession) {
          onAuthChange(adminToken, data.admin);
        }
      }
    } catch {
      setAuthError('Unable to reach server authentication service.');
    }
  }, [adminSession, adminToken, onAuthChange]);

  const fetchOverview = useCallback(async () => {
    if (!adminToken) {
      setOverview(null);
      return;
    }
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        onAuthChange(null, null);
        return;
      }
      const data = await res.json();
      if (data?.ok) {
        setOverview({ stats: data.stats });
      }
    } catch {
      // Non-blocking overview fetch
    }
  }, [adminToken, onAuthChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (adminToken && adminSession) {
      fetchOverview();
    } else {
      setOverview(null);
    }
  }, [adminToken, adminSession, fetchOverview]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passwordInput.trim().length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    if (passwordInput.trim() !== confirmPasswordInput.trim()) {
      setAuthError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data.token) {
        setAuthError(data?.error || 'Failed to set admin password.');
        await fetchStatus();
        return;
      }
      setPasswordInput('');
      setConfirmPasswordInput('');
      setConfigured(true);
      onAuthChange(data.token, data.admin);
      onNotify?.('Admin password claimed & signed in');
    } catch {
      setAuthError('Network error during admin setup.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!passwordInput.trim()) {
      setAuthError('Enter your admin password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data.token) {
        setAuthError(data?.error || 'Invalid credentials.');
        return;
      }
      setPasswordInput('');
      onAuthChange(data.token, data.admin);
      onNotify?.('Signed in as Admin');
    } catch {
      setAuthError('Network error signing in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (adminToken) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    } catch {
      // Clear local session regardless
    }
    setOverview(null);
    setActionFeedback(null);
    onAuthChange(null, null);
    onNotify?.('Signed out of Admin Console');
  };

  const handleAdminCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    const token = tokens.find((t) => t.id === creditTokenId);
    const parsedAmt = Number(creditAmount);
    if (!token || !Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      setActionFeedback('Enter a valid positive amount.');
      return;
    }

    setActionBusy(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/admin/wallet-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          tokenId: token.id,
          symbol: token.symbol,
          network: token.network,
          amount: parsedAmt,
          fromAddress: creditFromAddr.trim(),
          usdValue: parsedAmt * token.priceUsd,
        }),
      });
      if (res.status === 401) {
        onAuthChange(null, null);
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setActionFeedback(data?.error || 'Failed to credit funds.');
        return;
      }

      onCreditAsset(token.id, parsedAmt, 'receive', `Received ${token.symbol}`, {
        txHash: data.txHash,
        counterparty: creditFromAddr.trim(),
      });
      setActionFeedback(
        `Credited +${parsedAmt.toLocaleString('en-US')} ${token.symbol} to ${activeAccount.name}`
      );
      await fetchOverview();
    } catch {
      setActionFeedback('Request failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAdminReset = async () => {
    if (!adminToken) return;
    setActionBusy(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/admin/wallet-reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        onAuthChange(null, null);
        return;
      }
      if (res.ok) {
        onResetAccountEmpty();
        setActionFeedback(`Reset ${activeAccount.name} balance to $0.00`);
      }
    } catch {
      setActionFeedback('Request failed.');
    } finally {
      setActionBusy(false);
    }
  };

  if (configured === null) {
    return (
      <div className="py-8 text-center text-[13px] text-[#717680] dark:text-[#8E95A5]">
        Checking admin security state...
      </div>
    );
  }

  if (adminToken && adminSession) {
    return (
      <div className="space-y-3.5">
        {/* Authenticated Admin Header */}
        <div className="p-3.5 rounded-2xl bg-[#ECFDF5] dark:bg-[#052E16] border border-[#A7F3D0] dark:border-[#166534] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-bold text-[#065F46] dark:text-[#86EFAC] truncate">
                Admin Authenticated
              </div>
              <div className="text-[11.5px] text-[#047857] dark:text-[#4ADE80] truncate">{adminSession.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#14171F] border border-[#A7F3D0] dark:border-[#166534] text-[#065F46] dark:text-[#86EFAC] hover:bg-[#F0FDF4] dark:hover:bg-[#1C202B] text-[12px] font-semibold flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Overview KPIs */}
        {overview && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[#F8F9FB] dark:bg-[#1A1E29] border border-[#ECEDF0] dark:border-[#232836]">
              <div className="text-[11px] text-[#717680] dark:text-[#8E95A5]">Networks</div>
              <div className="text-[15px] font-bold text-[#141416] dark:text-[#F4F5F7] tabular-nums">
                {overview.stats.supportedChains}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8F9FB] dark:bg-[#1A1E29] border border-[#ECEDF0] dark:border-[#232836]">
              <div className="text-[11px] text-[#717680] dark:text-[#8E95A5]">Hot Wallets</div>
              <div className="text-[15px] font-bold text-[#141416] dark:text-[#F4F5F7] tabular-nums">
                {overview.stats.hotWalletsReady}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8F9FB] dark:bg-[#1A1E29] border border-[#ECEDF0] dark:border-[#232836]">
              <div className="text-[11px] text-[#717680] dark:text-[#8E95A5]">Events</div>
              <div className="text-[15px] font-bold text-[#141416] dark:text-[#F4F5F7] tabular-nums">
                {overview.stats.trackedEvents}
              </div>
            </div>
          </div>
        )}

        {/* Admin Credit Controls */}
        <form
          onSubmit={handleAdminCredit}
          className="p-3.5 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-[#FAFAFC] dark:bg-[#1A1E29] space-y-2.5"
        >
          <div className="text-[13px] font-bold text-[#141416] dark:text-[#F4F5F7]">
            Admin Credit ({activeAccount.name})
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={creditTokenId}
              onChange={(e) => setCreditTokenId(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-white dark:bg-[#14171F] border border-[#E5E7EB] dark:border-[#2D3343] text-[12.5px] font-semibold text-[#141416] dark:text-[#F4F5F7]"
            >
              {tokens.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol} · {t.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="any"
              min="0"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="Amount"
              className="px-2.5 py-2 rounded-xl bg-white dark:bg-[#14171F] border border-[#E5E7EB] dark:border-[#2D3343] text-[13px] font-bold text-[#141416] dark:text-[#F4F5F7] tabular-nums"
            />
          </div>

          <input
            type="text"
            value={creditFromAddr}
            onChange={(e) => setCreditFromAddr(e.target.value)}
            placeholder="Sender address"
            className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#14171F] border border-[#E5E7EB] dark:border-[#2D3343] text-[11.5px] font-mono text-[#141416] dark:text-[#F4F5F7]"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={actionBusy}
              className="flex-1 h-10 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] disabled:opacity-60 text-white text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Credit Wallet
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleAdminReset}
              className="px-3.5 h-10 rounded-xl bg-[#FEE2E2] dark:bg-[#450A0A] hover:bg-[#FECACA] dark:hover:bg-[#7F1D1D] text-[#B91C1C] dark:text-[#FCA5A5] text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Zero
            </button>
          </div>

          {actionFeedback && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#065F46] dark:text-[#86EFAC]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
          )}
        </form>
      </div>
    );
  }

  // First-run Setup / Claim Form (when ADMIN_PASSCODE env var is unset and not yet claimed)
  if (!configured) {
    return (
      <form onSubmit={handleSetupSubmit} className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-[#EEF0FF] dark:bg-[#1E2747] border border-[#D4D8FF] dark:border-[#2F3D6B] flex items-start gap-2.5">
          <KeyRound className="w-5 h-5 text-[#0500FF] dark:text-[#8FA4FF] shrink-0 mt-0.5" />
          <div className="text-[12px] text-[#1E1B4B] dark:text-[#DCE3FF] leading-relaxed">
            <strong className="font-semibold block mb-0.5">First-Run Admin Setup</strong>
            Choose your admin password to activate the Admin Console, or configure{' '}
            <code className="font-mono bg-white/80 dark:bg-[#14171F] px-1 rounded">ADMIN_PASSCODE</code> in Settings
            → Secrets.
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">Admin Email</label>
          <input
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="admin@trustwallet.local"
            className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[13px] text-[#141416] dark:text-[#F4F5F7] focus:outline-none focus:border-[#0500FF]"
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
            Create Admin Password (min 8 chars)
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter strong password"
            className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[13px] text-[#141416] dark:text-[#F4F5F7] focus:outline-none focus:border-[#0500FF]"
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPasswordInput}
            onChange={(e) => setConfirmPasswordInput(e.target.value)}
            placeholder="Re-enter password"
            className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[13px] text-[#141416] dark:text-[#F4F5F7] focus:outline-none focus:border-[#0500FF]"
          />
        </div>

        {authError && (
          <div className="text-[12px] font-medium text-[#DC2626] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FECACA] dark:border-[#7F1D1D] px-3 py-2 rounded-xl">
            {authError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] disabled:opacity-60 text-white text-[13.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          {submitting ? 'Claiming Admin Access...' : 'Set Password & Sign In'}
        </button>
      </form>
    );
  }

  // Standard Admin Sign In Form
  return (
    <form onSubmit={handleLoginSubmit} className="space-y-3">
      <div className="p-3.5 rounded-2xl bg-[#F8F9FB] dark:bg-[#1A1E29] border border-[#ECEDF0] dark:border-[#232836] flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#141416] dark:bg-[#0500FF] text-white flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[13.5px] font-bold text-[#141416] dark:text-[#F4F5F7]">Admin Login</div>
          <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5]">
            {envConfigured
              ? 'Protected by server ADMIN_PASSCODE'
              : 'Sign in with your claimed admin password'}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">Admin Email</label>
        <input
          type="email"
          required
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="admin@trustwallet.local"
          className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[13px] text-[#141416] dark:text-[#F4F5F7] focus:outline-none focus:border-[#0500FF]"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
          Admin Password
        </label>
        <input
          type="password"
          required
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="Enter admin password"
          className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[13px] text-[#141416] dark:text-[#F4F5F7] focus:outline-none focus:border-[#0500FF]"
        />
      </div>

      {authError && (
        <div className="text-[12px] font-medium text-[#DC2626] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FECACA] dark:border-[#7F1D1D] px-3 py-2 rounded-xl">
          {authError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] disabled:opacity-60 text-white text-[13.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
      >
        <Lock className="w-4 h-4" />
        {submitting ? 'Verifying...' : 'Sign In as Admin'}
      </button>
    </form>
  );
}
