import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  History,
  Moon,
  Pin,
  PinOff,
  Repeat2,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  Sun,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  ActiveModal,
  AdminSession,
  BottomNavTab,
  ConnectedDapp,
  HomeSubTab,
  NetworkId,
  TokenApproval,
  TokenAsset,
  WalletAccount,
  WalletTransaction,
} from './types/wallet';
import {
  INITIAL_ACCOUNTS,
  INITIAL_APPROVALS,
  INITIAL_DAPPS,
  INITIAL_TRANSACTIONS,
  TOKENS,
} from './data/walletData';
import { HomeNavIcon, TrustShieldLogo } from './components/icons/TrustIcons';
import { HomeTab } from './components/tabs/HomeTab';
import { TrendingTab } from './components/tabs/TrendingTab';
import { SwapTab } from './components/tabs/SwapTab';
import { EarnTab } from './components/tabs/EarnTab';
import { WalletModals } from './components/modals/WalletModals';
import { DesktopCompanion } from './components/DesktopCompanion';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import {
  LivePriceEntry,
  RealtimePaymentPayload,
  useRealtimePayments,
} from './hooks/useRealtimePayments';

export default function App() {
  const [accounts, setAccounts] = useState<WalletAccount[]>(INITIAL_ACCOUNTS);
  const [activeAccountId, setActiveAccountId] = useState<string>(INITIAL_ACCOUNTS[0].id);
  const [tokens, setTokens] = useState<TokenAsset[]>(TOKENS);
  const [bottomTab, setBottomTab] = useState<BottomNavTab>('home');
  const [homeSubTab, setHomeSubTab] = useState<HomeSubTab>('tokens');
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>('all');
  const [watchlistIds, setWatchlistIds] = useState<string[]>(['btc', 'eth', 'sol', 'twt']);
  const [approvals, setApprovals] = useState<TokenApproval[]>(INITIAL_APPROVALS);
  const [dapps, setDapps] = useState<ConnectedDapp[]>(INITIAL_DAPPS);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('usdt');
  const [preselectedBuyTokenId, setPreselectedBuyTokenId] = useState<string>('eth');
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = window.localStorage.getItem('trustwallet_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [focusedTx, setFocusedTx] = useState<WalletTransaction | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const creditedServerKeysRef = useRef<Set<string>>(new Set());
  const tokensRef = useRef<TokenAsset[]>(TOKENS);
  tokensRef.current = tokens;

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      window.localStorage.setItem('trustwallet_theme', theme);
    } catch {
      // Ignore storage failures in restricted frames
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0B0D12' : '#0500FF');
    }
  }, [theme]);

  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) ?? accounts[0];

  const accountTransactions = transactions.filter((tx) =>
    tx.accountId ? tx.accountId === activeAccount.id : activeAccount.id === 'acc-1'
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const handleChangeTheme = useCallback(
    (next: 'light' | 'dark') => {
      setTheme(next);
      showToast(next === 'dark' ? 'Night Mode enabled' : 'Day Mode enabled');
    },
    [showToast]
  );

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(next === 'dark' ? 'Night Mode enabled' : 'Day Mode enabled');
      return next;
    });
  }, [showToast]);

  const handleAdminAuthChange = useCallback(
    (token: string | null, session: AdminSession | null) => {
      setAdminToken(token);
      setAdminSession(session);
    },
    []
  );

  const resolveTokenIdForPayment = useCallback((payment: RealtimePaymentPayload) => {
    const currentTokens = tokensRef.current;
    if (payment.tokenId && currentTokens.some((t) => t.id === payment.tokenId)) {
      return payment.tokenId;
    }
    const sym = (payment.asset || '').toUpperCase();
    const exactMatch = currentTokens.find(
      (t) => t.symbol.toUpperCase() === sym && t.network === payment.network
    );
    if (exactMatch) return exactMatch.id;
    const symbolMatch = currentTokens.find((t) => t.symbol.toUpperCase() === sym);
    return symbolMatch?.id;
  }, []);

  const mergePaymentIntoState = useCallback(
    (payment: RealtimePaymentPayload, shouldNotify: boolean) => {
      const resolvedTokenId = resolveTokenIdForPayment(payment);
      const normalizedTx: WalletTransaction = {
        ...payment,
        accountId: payment.accountId ?? activeAccountId,
        tokenId: resolvedTokenId,
      };
      const key = payment.txHash
        ? `${payment.network}:${payment.txHash.toLowerCase()}`
        : payment.id;

      setTransactions((prev) => {
        const idx = prev.findIndex((item) => {
          const itemKey = item.txHash
            ? `${item.network}:${item.txHash.toLowerCase()}`
            : item.id;
          return itemKey === key || item.id === payment.id;
        });

        if (idx === -1) {
          return [normalizedTx, ...prev];
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...normalizedTx };
        return updated;
      });

      if (
        payment.applyBalance &&
        payment.status === 'Confirmed' &&
        resolvedTokenId &&
        typeof payment.amount === 'number' &&
        payment.amount > 0 &&
        !creditedServerKeysRef.current.has(key)
      ) {
        creditedServerKeysRef.current.add(key);
        const isOut = payment.amountText.startsWith('-');
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id !== activeAccountId) return acc;
            const currentQty = acc.balances[resolvedTokenId] ?? 0;
            const nextQty = isOut
              ? Math.max(0, currentQty - payment.amount!)
              : currentQty + payment.amount!;
            const enabledTokenIds = acc.enabledTokenIds.includes(resolvedTokenId)
              ? acc.enabledTokenIds
              : [...acc.enabledTokenIds, resolvedTokenId];
            return {
              ...acc,
              enabledTokenIds,
              balances: {
                ...acc.balances,
                [resolvedTokenId]: Number(nextQty.toFixed(6)),
              },
            };
          })
        );
      }

      if (shouldNotify) {
        showToast(`${payment.title} · ${payment.amountText}`);
      }
    },
    [activeAccountId, resolveTokenIdForPayment, showToast]
  );

  const handleInitOrSyncPayments = useCallback(
    (payments: RealtimePaymentPayload[]) => {
      for (const p of payments) {
        mergePaymentIntoState(p, false);
      }
    },
    [mergePaymentIntoState]
  );

  const handleRealtimePaymentEvent = useCallback(
    (payment: RealtimePaymentPayload, _mode: 'created' | 'updated') => {
      mergePaymentIntoState(payment, true);
    },
    [mergePaymentIntoState]
  );

  const handlePricesUpdate = useCallback((prices: Record<string, LivePriceEntry>) => {
    setTokens((prev) =>
      prev.map((token) => {
        const live = prices[token.id];
        if (!live || !Number.isFinite(live.priceUsd) || live.priceUsd <= 0) {
          return token;
        }
        const prevLast = token.sparkline[token.sparkline.length - 1];
        const nextSparkline =
          prevLast !== live.priceUsd
            ? [...token.sparkline.slice(-6), live.priceUsd]
            : token.sparkline;
        return {
          ...token,
          priceUsd: live.priceUsd,
          change24h: Number.isFinite(live.change24h) ? live.change24h : token.change24h,
          sparkline: nextSparkline,
        };
      })
    );
    const liveEthPrice = prices.eth?.priceUsd;
    if (liveEthPrice && Number.isFinite(liveEthPrice) && liveEthPrice > 0) {
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== 'tx-eth-179-99' || !tx.amount) return tx;
          const usdVal = tx.amount * liveEthPrice;
          return {
            ...tx,
            usdText: `$${usdVal.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          };
        })
      );
    }
  }, []);

  const { isSyncing, refreshNow, trackTxHash } = useRealtimePayments({
    addresses: activeAccount.addresses,
    onInitOrSync: handleInitOrSyncPayments,
    onPaymentEvent: handleRealtimePaymentEvent,
    onPricesUpdate: handlePricesUpdate,
  });

  const handleToggleWatchlist = (tokenId: string) => {
    setWatchlistIds((prev) =>
      prev.includes(tokenId) ? prev.filter((id) => id !== tokenId) : [...prev, tokenId]
    );
  };

  const handleToggleTokenEnabled = (tokenId: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeAccount.id) return acc;
        const exists = acc.enabledTokenIds.includes(tokenId);
        return {
          ...acc,
          enabledTokenIds: exists
            ? acc.enabledTokenIds.filter((id) => id !== tokenId)
            : [...acc.enabledTokenIds, tokenId],
        };
      })
    );
  };

  const handleToggleDapp = (dappId: string) => {
    setDapps((prev) =>
      prev.map((d) => (d.id === dappId ? { ...d, connected: !d.connected } : d))
    );
  };

  const handleRevokeApproval = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    showToast('Token allowance revoked');
  };

  const handleCreditAsset = (
    tokenId: string,
    amount: number,
    source: 'receive' | 'deposit' | 'buy',
    label: string,
    customMeta?: { txHash?: string; counterparty?: string }
  ) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token || amount <= 0) return;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeAccount.id) return acc;
        const currentQty = acc.balances[tokenId] ?? 0;
        const enabledTokenIds = acc.enabledTokenIds.includes(tokenId)
          ? acc.enabledTokenIds
          : [...acc.enabledTokenIds, tokenId];
        return {
          ...acc,
          enabledTokenIds,
          balances: {
            ...acc.balances,
            [tokenId]: Number((currentQty + amount).toFixed(6)),
          },
        };
      })
    );

    const usdVal = amount * token.priceUsd;
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        accountId: activeAccount.id,
        type: source,
        tokenId: token.id,
        title: label,
        subtitle: `${activeAccount.name} · Confirmed`,
        amountText: `+${amount.toLocaleString('en-US', { maximumFractionDigits: 5 })} ${token.symbol}`,
        usdText: `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        timestamp: 'Just now',
        network: token.network,
        status: 'Confirmed',
        txHash:
          customMeta?.txHash ||
          `0x${Date.now().toString(16)}a4f92c81d7e3b605219c8e4a7f2d0b91c8e3a7`,
        counterparty: customMeta?.counterparty || activeAccount.addresses[token.network],
        feeText: '0.0008 ETH ($2.55)',
      },
      ...prev,
    ]);

    setBottomTab('home');
    setHomeSubTab('tokens');
    showToast(`Added +${amount.toLocaleString('en-US')} ${token.symbol}`);
  };

  const handleSendAsset = (tokenId: string, amount: number, recipient: string) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token || amount <= 0) return;
    const currentQty = activeAccount.balances[tokenId] ?? 0;
    if (amount > currentQty) return;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeAccount.id) return acc;
        return {
          ...acc,
          balances: {
            ...acc.balances,
            [tokenId]: Number((currentQty - amount).toFixed(6)),
          },
        };
      })
    );

    const usdVal = amount * token.priceUsd;
    const shortRecipient =
      recipient.length > 12 ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : recipient;
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        accountId: activeAccount.id,
        type: 'send',
        tokenId: token.id,
        title: `Sent ${token.symbol}`,
        subtitle: `To ${shortRecipient} · Confirmed`,
        amountText: `-${amount.toLocaleString('en-US', { maximumFractionDigits: 5 })} ${token.symbol}`,
        usdText: `-$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        timestamp: 'Just now',
        network: token.network,
        status: 'Confirmed',
        txHash: `0x${Date.now().toString(16)}9e4b2c71a8f03d15e4b7c2d901a6f83e4b9d12`,
        counterparty: recipient,
        feeText: '0.0012 ETH ($3.82)',
      },
      ...prev,
    ]);

    showToast(`Sent ${amount.toLocaleString('en-US')} ${token.symbol}`);
  };

  const handleExecuteSwap = (
    fromId: string,
    toId: string,
    fromAmount: number,
    toAmount: number
  ) => {
    const fromTok = tokens.find((t) => t.id === fromId);
    const toTok = tokens.find((t) => t.id === toId);
    if (!fromTok || !toTok) return;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeAccount.id) return acc;
        const nextFrom = Math.max(0, (acc.balances[fromId] ?? 0) - fromAmount);
        const nextTo = (acc.balances[toId] ?? 0) + toAmount;
        const enabledTokenIds = acc.enabledTokenIds.includes(toId)
          ? acc.enabledTokenIds
          : [...acc.enabledTokenIds, toId];
        return {
          ...acc,
          enabledTokenIds,
          balances: {
            ...acc.balances,
            [fromId]: Number(nextFrom.toFixed(6)),
            [toId]: Number(nextTo.toFixed(6)),
          },
        };
      })
    );

    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        accountId: activeAccount.id,
        type: 'swap',
        title: `Swapped ${fromTok.symbol} → ${toTok.symbol}`,
        subtitle: `${fromAmount} ${fromTok.symbol}`,
        amountText: `+${toAmount.toFixed(4)} ${toTok.symbol}`,
        usdText: `$${(fromAmount * fromTok.priceUsd).toFixed(2)}`,
        timestamp: 'Just now',
        network: toTok.network,
        status: 'Confirmed',
      },
      ...prev,
    ]);
    showToast(`Swapped ${fromTok.symbol} for ${toTok.symbol}`);
  };

  const handleStake = (symbol: string, amount: number) => {
    const token = tokens.find((t) => t.symbol === symbol);
    if (!token) return;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeAccount.id) return acc;
        const nextBal = Math.max(0, (acc.balances[token.id] ?? 0) - amount);
        return {
          ...acc,
          balances: {
            ...acc.balances,
            [token.id]: Number(nextBal.toFixed(6)),
          },
        };
      })
    );

    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        accountId: activeAccount.id,
        type: 'stake',
        title: `Staked ${symbol}`,
        subtitle: activeAccount.name,
        amountText: `${amount} ${symbol}`,
        usdText: `$${(amount * token.priceUsd).toFixed(2)}`,
        timestamp: 'Just now',
        network: token.network,
        status: 'Confirmed',
      },
      ...prev,
    ]);
    showToast(`Staked ${amount} ${symbol}`);
  };

  const handleAddAccount = () => {
    const nextNum = accounts.length + 1;
    const evmAddr = `0x${nextNum}8B4E91C7a20D5f63E12A94B8c0F3d12E7a40B${nextNum}C`;
    const newAcc: WalletAccount = {
      id: `acc-${Date.now()}`,
      seedGroup: 'Seed Phrase 1',
      name: `Account ${nextNum}`,
      addresses: {
        bsc: evmAddr,
        ethereum: evmAddr,
        solana: `${nextNum}pL9xR4vKwQ3nZ8bF6tYdU5sJ1aH9cG2eT4kM87nRt`,
        tron: `T${nextNum}9PoY8kL3xR2mQvN7wF5tCzB4jH6sD9eG2u4cK`,
        arbitrum: evmAddr,
        base: evmAddr,
        bitcoin: `bc1q${nextNum}d4f7k2m5v8x3c6n9p2q4r7s0t3u6w8y1z4a9k`,
        robinhood: evmAddr,
        arc: evmAddr,
        aeternity: `ak_${nextNum}CLLAWX6YJY4gzQ2FAGkokvTV9E71YGgckS3vN8J3pi7sppVQ`,
        algorand: `${nextNum}BLL7MNLEL7EVBZDCNRZPKZWWG2CW6XKNH2W3GY4VGCBYUNGNX4DQZACD`,
        aptos: `0x${nextNum}07069dc9dd6d0a141f5ab6c1550b738ba626beb07ee1960c1c86bec5033f86`,
        avalanche: evmAddr,
        bitcoincash: `bitcoincash:qqxfh50vdax0fa27pcat2l2n0f2ltud2jvke47jt2${nextNum}`,
        cardano: `addr1q${nextNum}x7v5k3m2n8p4q6r7s0t3u6w8y1z4a9k2m5v8x3c6n9p2y8m4kp`,
        kava: `kava1q${nextNum}f3z2x7c9v5b4n3m2k1j8h7g6f5d4s3a2p9q8r`,
        litecoin: `ltc1q${nextNum}xx33yvzengkv69scxvrcyxsy9qd70y04rk4zk`,
        optimism: evmAddr,
        polkadot: `1${nextNum}NX1XvdG9UJPWAre3Wx9mb38ijYNEvHiDEXcTeEwkAfpc2a`,
        polygon: evmAddr,
        xrp: `rU${nextNum}qNWoRQEUY8uUfgALrDcrVooctjxcubj`,
        xlm: `GARILIMLAVQRO4TZADWL3RV5CEQ67LRK4JKOPYF2EH2IHTS2B3GGBLY${nextNum}`,
        sui: `0x${nextNum}3b045147b354af6743c2a79c5fa0e97126a75c08feffc1c4a0f36b7257a4dd`,
        ton: `UQA${nextNum}ikkq1IcDBWhvZ0fP2d-D-HY2r_luQYLI7g7ueTqRLuZ3`,
        viacoin: `via1q${nextNum}6s3ruu4whyz38q2g96yh5kp63v5e6tnt2z5r4`,
        zcash: `t1J${nextNum}cTypGyv9AtGREkHTZHc68nHg8uA83at`,
        zilliqa: `zil1${nextNum}grd2hlm6jdu6jjsaraghnjcnurayrd3mpf2ek`,
      },
      balances: {},
      enabledTokenIds: ['usdt', 'btc', 'eth', 'bnb', 'sol', 'trx', 'twt', 'bch', 'ada', 'kava'],
    };
    setAccounts((prev) => [...prev, newAcc]);
    setActiveAccountId(newAcc.id);
    setActiveModal(null);
    showToast(`Created ${newAcc.name}`);
  };

  const handleResetEmpty = () => {
    setAccounts((prev) =>
      prev.map((acc) => ({ ...acc, balances: {} }))
    );
    setTransactions([]);
    creditedServerKeysRef.current.clear();
    showToast('All funds and history reset to zero');
  };

  const handleDeleteAccount = (accountId: string) => {
    if (accounts.length <= 1) {
      handleResetEmpty();
      return;
    }
    const target = accounts.find((a) => a.id === accountId);
    const remaining = accounts.filter((a) => a.id !== accountId);
    setAccounts(remaining);
    if (activeAccountId === accountId && remaining[0]) {
      setActiveAccountId(remaining[0].id);
    }
    if (target) showToast(`Deleted ${target.name}`);
  };

  const handleFundStarterPack = () => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === activeAccount.id
          ? {
              ...acc,
              enabledTokenIds: Array.from(
                new Set([
                  ...acc.enabledTokenIds,
                  'btc',
                  'usdt',
                  'eth',
                  'bnb',
                  'sol',
                  'trx',
                  'twt',
                  'bch',
                  'ada',
                  'kava',
                ])
              ),
              balances: {
                btc: 30,
                usdt: 350000,
                eth: 6.5,
                bnb: 3.5,
                sol: 48,
                trx: 15000,
                twt: 4200,
                bch: 14.5,
                ada: 8500,
                kava: 6200,
              },
            }
          : acc
      )
    );
    setBottomTab('home');
    setHomeSubTab('tokens');
    showToast('Loaded multi-chain portfolio funds');
  };

  const handleQuickBuyToken = (tokenId: string) => {
    setPreselectedBuyTokenId(tokenId);
    setActiveModal('buy');
  };

  const hasConnectedDapp = dapps.some((d) => d.connected);

  return (
    <div className="min-h-screen bg-[#F4F5F8] dark:bg-[#0B0D12] text-[#141416] dark:text-[#F4F5F7] flex items-center justify-center lg:p-6 transition-colors">
      <div className="w-full lg:max-w-[980px] flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
        {/* Trust Wallet Extension Window */}
        {isMinimized ? (
          <div className="w-full max-w-[386px] bg-white dark:bg-[#14171F] rounded-[20px] border border-[#E5E7EB] dark:border-[#232836] shadow-lg p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF0FF] dark:bg-[#1E2747] mx-auto flex items-center justify-center">
              <TrustShieldLogo className="w-6 h-7" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#141416] dark:text-[#F4F5F7]">Trust Wallet Minimized</h2>
              <p className="text-[13px] text-[#717680] dark:text-[#8E95A5] mt-1">
                Click below to reopen the browser extension popup.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="w-full h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] text-white text-[13.5px] font-semibold transition-colors"
            >
              Open Trust Wallet
            </button>
          </div>
        ) : (
          <main
            className="relative w-full lg:w-[386px] min-h-screen lg:min-h-[652px] lg:h-[652px] bg-white dark:bg-[#14171F] lg:rounded-[18px] lg:border lg:border-[#E2E4E9] dark:lg:border-[#232836] lg:shadow-[0_18px_48px_rgba(16,24,40,0.09)] dark:lg:shadow-[0_18px_48px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden shrink-0 transition-colors"
            aria-label="Trust Wallet Extension"
          >
            {/* Top Extension Title Bar */}
            <header className="px-4 h-[46px] border-b border-[#ECEDF0] dark:border-[#232836] flex items-center justify-between shrink-0 bg-white dark:bg-[#14171F]">
              <div className="flex items-center gap-2">
                <TrustShieldLogo className="w-[18px] h-[20px]" />
                <span className="text-[14.5px] font-semibold text-[#141416] dark:text-[#F4F5F7] tracking-[-0.01em] whitespace-nowrap">
                  Trust Wallet
                </span>
              </div>

              <div className="flex items-center gap-1">
                <PWAInstallButton variant="compact" />
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
                  aria-label={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#525866] dark:text-[#FACC15] hover:bg-[#F3F4F6] dark:hover:bg-[#1C202B] transition-colors"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-[16px] h-[16px]" strokeWidth={2} />
                  ) : (
                    <Moon className="w-[16px] h-[16px]" strokeWidth={1.9} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPinned((p) => !p);
                    showToast(isPinned ? 'Extension unpinned' : 'Extension pinned');
                  }}
                  title={isPinned ? 'Unpin window' : 'Pin window'}
                  aria-label={isPinned ? 'Unpin window' : 'Pin window'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isPinned
                      ? 'text-[#0500FF] dark:text-[#6B85FF] bg-[#EEF0FF] dark:bg-[#1E2747]'
                      : 'text-[#525866] dark:text-[#8E95A5] hover:bg-[#F3F4F6] dark:hover:bg-[#1C202B]'
                  }`}
                >
                  {isPinned ? (
                    <Pin className="w-[16px] h-[16px]" strokeWidth={1.8} />
                  ) : (
                    <PinOff className="w-[16px] h-[16px]" strokeWidth={1.8} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  title="Close extension popup"
                  aria-label="Close extension popup"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#525866] dark:text-[#8E95A5] hover:bg-[#F3F4F6] dark:hover:bg-[#1C202B] transition-colors"
                >
                  <X className="w-[17px] h-[17px]" strokeWidth={1.8} />
                </button>
              </div>
            </header>

            {/* Wallet Account & Action Icons Header */}
            <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2 shrink-0 bg-white dark:bg-[#14171F]">
              <button
                type="button"
                onClick={() => setActiveModal('accounts')}
                className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0500FF] rounded-lg py-0.5 pr-2 min-w-0"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[14.5px] font-medium text-[#141416] dark:text-[#F4F5F7] truncate">
                    {activeAccount.seedGroup}
                  </span>
                  <svg
                    viewBox="0 0 10 6"
                    className="w-2.5 h-1.5 text-[#7B808C] dark:text-[#8E95A5] group-hover:text-[#141416] dark:group-hover:text-[#F4F5F7] transition-colors shrink-0"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M0.8 0.5H9.2L5 5.5L0.8 0.5Z" />
                  </svg>
                </div>
                <div className="text-[13px] font-normal text-[#7B808C] dark:text-[#8E95A5] leading-tight truncate">
                  {activeAccount.name}
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveModal('dapps')}
                  title="Connected dApps"
                  aria-label="Connected dApps"
                  className="w-[34px] h-[34px] rounded-full border border-dashed border-[#D1D5DB] dark:border-[#353C4E] hover:border-[#9CA3AF] flex items-center justify-center transition-colors"
                >
                  <span
                    className={`w-[9px] h-[9px] rounded-full ${
                      hasConnectedDapp ? 'bg-[#16A34A]' : 'bg-[#C4C7CE] dark:bg-[#4B5563]'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('search')}
                  title="Search assets"
                  aria-label="Search assets"
                  className="w-[34px] h-[34px] rounded-full bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] flex items-center justify-center text-[#141416] dark:text-[#F4F5F7] transition-colors"
                >
                  <Search className="w-[17px] h-[17px]" strokeWidth={2} />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('history')}
                  title="Transaction history"
                  aria-label="Transaction history"
                  className="w-[34px] h-[34px] rounded-full bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] flex items-center justify-center text-[#141416] dark:text-[#F4F5F7] transition-colors"
                >
                  <History className="w-[17px] h-[17px]" strokeWidth={2} />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('settings')}
                  title="Settings"
                  aria-label="Settings"
                  className="w-[34px] h-[34px] rounded-full bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] flex items-center justify-center text-[#141416] dark:text-[#F4F5F7] transition-colors"
                >
                  <Settings className="w-[17px] h-[17px]" strokeWidth={2} />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('admin')}
                  title={adminSession ? 'Admin Console (Signed In)' : 'Admin Login'}
                  aria-label="Admin Login"
                  className={`w-[34px] h-[34px] rounded-full flex items-center justify-center transition-colors ${
                    adminSession
                      ? 'bg-[#ECFDF5] dark:bg-[#052E16] text-[#16A34A] dark:text-[#4ADE80] border border-[#A7F3D0] dark:border-[#166534]'
                      : 'bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] text-[#141416] dark:text-[#F4F5F7]'
                  }`}
                >
                  <ShieldCheck className="w-[17px] h-[17px]" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 flex flex-col overflow-y-auto wallet-scroll">
              {bottomTab === 'home' && (
                <HomeTab
                  account={activeAccount}
                  tokens={tokens}
                  transactions={accountTransactions}
                  homeSubTab={homeSubTab}
                  setHomeSubTab={setHomeSubTab}
                  selectedNetwork={selectedNetwork}
                  watchlistIds={watchlistIds}
                  toggleWatchlist={handleToggleWatchlist}
                  approvals={approvals}
                  onRevokeApproval={handleRevokeApproval}
                  onOpenModal={(modal) => {
                    if (modal === 'history') setFocusedTx(null);
                    setActiveModal(modal);
                  }}
                  onOpenTxReceipt={(tx) => {
                    setFocusedTx(tx);
                    setActiveModal('history');
                  }}
                  onRefreshPayments={refreshNow}
                  isSyncingPayments={isSyncing}
                  onSelectToken={(tokenId) => {
                    setSelectedTokenId(tokenId);
                    setActiveModal('token_detail');
                  }}
                  onQuickBuyToken={handleQuickBuyToken}
                  onResetEmpty={handleResetEmpty}
                  currency={currency}
                />
              )}

              {bottomTab === 'trending' && (
                <TrendingTab
                  tokens={tokens}
                  watchlistIds={watchlistIds}
                  toggleWatchlist={handleToggleWatchlist}
                  onQuickBuyToken={handleQuickBuyToken}
                />
              )}

              {bottomTab === 'swap' && (
                <SwapTab
                  account={activeAccount}
                  tokens={tokens}
                  onExecuteSwap={handleExecuteSwap}
                  onOpenBuy={() => setActiveModal('buy')}
                />
              )}

              {bottomTab === 'earn' && (
                <EarnTab
                  account={activeAccount}
                  onStake={handleStake}
                  onOpenBuy={() => setActiveModal('buy')}
                />
              )}
            </div>

            {/* Toast Feedback Banner */}
            {toastMessage && (
              <div className="absolute bottom-[68px] left-1/2 -translate-x-1/2 z-30 px-3.5 py-2 rounded-xl bg-[#141416] dark:bg-[#272D3D] text-white text-[12px] font-medium shadow-lg whitespace-nowrap border border-transparent dark:border-[#374056]">
                {toastMessage}
              </div>
            )}

            {/* Bottom Tab Navigation Bar */}
            <nav
              aria-label="Primary navigation"
              className="h-[60px] border-t border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#14171F] grid grid-cols-4 items-center shrink-0"
            >
              <button
                type="button"
                onClick={() => setBottomTab('home')}
                className="h-full flex flex-col items-center justify-center gap-0.5 focus:outline-none focus-visible:bg-[#F8F9FB] dark:focus-visible:bg-[#1C202B]"
              >
                <HomeNavIcon active={bottomTab === 'home'} className="w-[21px] h-[21px]" />
                <span
                  className={`text-[11.5px] leading-none mt-0.5 whitespace-nowrap ${
                    bottomTab === 'home'
                      ? 'font-semibold text-[#0500FF] dark:text-[#6B85FF]'
                      : 'font-medium text-[#141416] dark:text-[#F4F5F7]'
                  }`}
                >
                  Home
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBottomTab('trending')}
                className="h-full flex flex-col items-center justify-center gap-0.5 focus:outline-none focus-visible:bg-[#F8F9FB] dark:focus-visible:bg-[#1C202B]"
              >
                <TrendingUp
                  className={`w-[20px] h-[20px] ${
                    bottomTab === 'trending' ? 'text-[#0500FF] dark:text-[#6B85FF]' : 'text-[#141416] dark:text-[#F4F5F7]'
                  }`}
                  strokeWidth={2}
                />
                <span
                  className={`text-[11.5px] leading-none mt-0.5 whitespace-nowrap ${
                    bottomTab === 'trending'
                      ? 'font-semibold text-[#0500FF] dark:text-[#6B85FF]'
                      : 'font-medium text-[#141416] dark:text-[#F4F5F7]'
                  }`}
                >
                  Trending
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBottomTab('swap')}
                className="h-full flex flex-col items-center justify-center gap-0.5 focus:outline-none focus-visible:bg-[#F8F9FB] dark:focus-visible:bg-[#1C202B]"
              >
                <Repeat2
                  className={`w-[21px] h-[21px] ${
                    bottomTab === 'swap' ? 'text-[#0500FF] dark:text-[#6B85FF]' : 'text-[#141416] dark:text-[#F4F5F7]'
                  }`}
                  strokeWidth={2}
                />
                <span
                  className={`text-[11.5px] leading-none mt-0.5 whitespace-nowrap ${
                    bottomTab === 'swap'
                      ? 'font-semibold text-[#0500FF] dark:text-[#6B85FF]'
                      : 'font-medium text-[#141416] dark:text-[#F4F5F7]'
                  }`}
                >
                  Swap
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBottomTab('earn')}
                className="h-full flex flex-col items-center justify-center gap-0.5 focus:outline-none focus-visible:bg-[#F8F9FB] dark:focus-visible:bg-[#1C202B]"
              >
                <Sprout
                  className={`w-[20px] h-[20px] ${
                    bottomTab === 'earn' ? 'text-[#0500FF] dark:text-[#6B85FF]' : 'text-[#141416] dark:text-[#F4F5F7]'
                  }`}
                  strokeWidth={2}
                />
                <span
                  className={`text-[11.5px] leading-none mt-0.5 whitespace-nowrap ${
                    bottomTab === 'earn'
                      ? 'font-semibold text-[#0500FF] dark:text-[#6B85FF]'
                      : 'font-medium text-[#141416] dark:text-[#F4F5F7]'
                  }`}
                >
                  Earn
                </span>
              </button>
            </nav>

            {/* Interactive Overlay Modals inside Wallet */}
            <WalletModals
              activeModal={activeModal}
              onClose={() => {
                setFocusedTx(null);
                setActiveModal(null);
              }}
              onOpenModal={setActiveModal}
              accounts={accounts}
              activeAccount={activeAccount}
              onSelectAccount={(id) => {
                setActiveAccountId(id);
                const target = accounts.find((a) => a.id === id);
                if (target) showToast(`Switched to ${target.name}`);
              }}
              onAddAccount={handleAddAccount}
              onDeleteAccount={handleDeleteAccount}
              onResetAccountEmpty={handleResetEmpty}
              tokens={tokens}
              selectedTokenId={selectedTokenId}
              onSelectToken={setSelectedTokenId}
              selectedNetwork={selectedNetwork}
              onSelectNetwork={setSelectedNetwork}
              onToggleTokenEnabled={handleToggleTokenEnabled}
              watchlistIds={watchlistIds}
              onToggleWatchlist={handleToggleWatchlist}
              dapps={dapps}
              onToggleDapp={handleToggleDapp}
              transactions={accountTransactions}
              focusedTx={focusedTx}
              onClearFocusedTx={() => setFocusedTx(null)}
              onRefreshPayments={refreshNow}
              isSyncingPayments={isSyncing}
              onTrackTxHash={trackTxHash}
              onCreditAsset={handleCreditAsset}
              onSendAsset={handleSendAsset}
              preselectedBuyTokenId={preselectedBuyTokenId}
              currency={currency}
              onChangeCurrency={setCurrency}
              theme={theme}
              onChangeTheme={handleChangeTheme}
              adminToken={adminToken}
              adminSession={adminSession}
              onAdminAuthChange={handleAdminAuthChange}
              onNotify={showToast}
            />
          </main>
        )}

        {/* Synchronized Desktop Overview Panel (visible on lg+ screens) */}
        <DesktopCompanion
          activeAccount={activeAccount}
          tokens={tokens}
          transactions={accountTransactions}
          dapps={dapps}
          currency={currency}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onRefreshPayments={refreshNow}
          isSyncingPayments={isSyncing}
          onOpenModal={(modal) => {
            setIsMinimized(false);
            if (modal === 'history') setFocusedTx(null);
            setActiveModal(modal);
          }}
          onOpenTxReceipt={(tx) => {
            setIsMinimized(false);
            setFocusedTx(tx);
            setActiveModal('history');
          }}
          onFundStarterPack={handleFundStarterPack}
          onResetEmpty={handleResetEmpty}
          adminToken={adminToken}
          adminSession={adminSession}
          onAdminAuthChange={handleAdminAuthChange}
          onCreditAsset={handleCreditAsset}
          onNotify={showToast}
        />
      </div>
      <OfflineIndicator />
    </div>
  );
}
