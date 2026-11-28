import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Star,
  X,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Send,
  QrCode,
  CreditCard,
  ChevronLeft,
  Clock,
  RefreshCw,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';
import {
  ActiveModal,
  AdminSession,
  ConnectedDapp,
  NetworkId,
  TokenAsset,
  WalletAccount,
  WalletTransaction,
} from '../../types/wallet';
import QRCode from 'qrcode';
import { NETWORKS } from '../../data/walletData';
import { BinanceIcon, NetworkLogoIcon, TokenBadgeIcon } from '../icons/TrustIcons';
import { PWAInstallButton } from '../PWAInstallButton';
import { AdminPanel } from '../AdminPanel';

interface WalletModalsProps {
  activeModal: ActiveModal;
  onClose: () => void;
  onOpenModal: (modal: ActiveModal) => void;
  accounts: WalletAccount[];
  activeAccount: WalletAccount;
  onSelectAccount: (id: string) => void;
  onAddAccount: () => void;
  onDeleteAccount?: (id: string) => void;
  onResetAccountEmpty: () => void;
  tokens: TokenAsset[];
  selectedTokenId: string;
  onSelectToken: (tokenId: string) => void;
  selectedNetwork: NetworkId;
  onSelectNetwork: (net: NetworkId) => void;
  onToggleTokenEnabled: (tokenId: string) => void;
  watchlistIds: string[];
  onToggleWatchlist: (tokenId: string) => void;
  dapps: ConnectedDapp[];
  onToggleDapp: (dappId: string) => void;
  transactions: WalletTransaction[];
  focusedTx?: WalletTransaction | null;
  onClearFocusedTx?: () => void;
  onRefreshPayments?: () => void;
  isSyncingPayments?: boolean;
  onTrackTxHash?: (params: {
    network: string;
    txHash: string;
    tokenType?: string;
    memoOrTag?: string;
  }) => Promise<{ ok?: boolean; status?: string; error?: string }>;
  onCreditAsset: (
    tokenId: string,
    amount: number,
    source: 'receive' | 'deposit' | 'buy',
    label: string,
    customMeta?: { txHash?: string; counterparty?: string }
  ) => void;
  onSendAsset: (tokenId: string, amount: number, recipient: string) => void;
  preselectedBuyTokenId: string;
  currency: 'USD' | 'EUR';
  onChangeCurrency: (curr: 'USD' | 'EUR') => void;
  theme: 'light' | 'dark';
  onChangeTheme: (theme: 'light' | 'dark') => void;
  adminToken: string | null;
  adminSession: AdminSession | null;
  onAdminAuthChange: (token: string | null, session: AdminSession | null) => void;
  onNotify?: (msg: string) => void;
}

function QrMatrixSvg({ seed }: { seed: string }) {
  const { size, modules } = useMemo(() => {
    const value = seed && seed.trim().length > 0 ? seed.trim() : ' ';
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    const data = qr.modules.data;
    const coords: Array<{ x: number; y: number }> = [];
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (data[r * count + c]) {
          coords.push({ x: c, y: r });
        }
      }
    }
    return { size: count, modules: coords };
  }, [seed]);

  const quietZone = 2;
  const viewSize = size + quietZone * 2;

  return (
    <svg
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      className="w-44 h-44"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Scannable QR code for ${seed}`}
    >
      <rect width={viewSize} height={viewSize} fill="#FFFFFF" />
      {modules.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x + quietZone}
          y={y + quietZone}
          width="1"
          height="1"
          fill="#141416"
        />
      ))}
    </svg>
  );
}

export function WalletModals({
  activeModal,
  onClose,
  onOpenModal,
  accounts,
  activeAccount,
  onSelectAccount,
  onAddAccount,
  onDeleteAccount,
  onResetAccountEmpty,
  tokens,
  selectedTokenId,
  selectedNetwork,
  onSelectNetwork,
  onToggleTokenEnabled,
  watchlistIds,
  onToggleWatchlist,
  dapps,
  onToggleDapp,
  transactions,
  focusedTx,
  onClearFocusedTx,
  onRefreshPayments,
  isSyncingPayments = false,
  onTrackTxHash,
  onCreditAsset,
  onSendAsset,
  preselectedBuyTokenId,
  currency,
  onChangeCurrency,
  theme,
  onChangeTheme,
  adminToken,
  adminSession,
  onAdminAuthChange,
  onNotify,
}: WalletModalsProps) {
  const [receiveNet, setReceiveNet] = useState<Exclude<NetworkId, 'all'> | null>(null);
  const [pendingReceiveNet, setPendingReceiveNet] = useState<Exclude<NetworkId, 'all'> | null>(null);
  const [networkSearch, setNetworkSearch] = useState('');
  const [copiedNetId, setCopiedNetId] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [binanceTokenId, setBinanceTokenId] = useState('usdt');
  const [binanceAmount, setBinanceAmount] = useState('250');
  const [buyTokenId, setBuyTokenId] = useState(preselectedBuyTokenId || 'eth');
  const [buyUsdAmount, setBuyUsdAmount] = useState('100');
  const [buyProvider, setBuyProvider] = useState<'MoonPay' | 'Ramp' | 'Transak'>('MoonPay');
  const [showSeedPreview, setShowSeedPreview] = useState(false);

  // Send modal state
  const [sendTokenId, setSendTokenId] = useState(selectedTokenId || 'usdt');
  const [sendRecipient, setSendRecipient] = useState('0x7aF931C2e8B0419a2F5D8312b7A9E108C44f42D8');
  const [sendAmount, setSendAmount] = useState('');

  // History receipt detail & live Tx tracker state
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [showTxTracker, setShowTxTracker] = useState(false);
  const [trackNetwork, setTrackNetwork] = useState<Exclude<NetworkId, 'all'>>('bsc');
  const [trackTokenType, setTrackTokenType] = useState('USDT');
  const [trackHashInput, setTrackHashInput] = useState('');
  const [trackSubmitting, setTrackSubmitting] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedBuyTokenId) {
      setBuyTokenId(preselectedBuyTokenId);
    }
  }, [preselectedBuyTokenId, activeModal]);

  useEffect(() => {
    if (selectedTokenId) {
      setSendTokenId(selectedTokenId);
    }
  }, [selectedTokenId, activeModal]);

  useEffect(() => {
    if (focusedTx && activeModal === 'history') {
      setSelectedTxId(focusedTx.id);
    }
  }, [focusedTx, activeModal]);

  useEffect(() => {
    if (activeModal !== 'history' && activeModal !== 'token_detail') {
      setSelectedTxId(null);
      setShowTxTracker(false);
      setTrackError(null);
    }
    if (activeModal === 'receive') {
      if (pendingReceiveNet) {
        setReceiveNet(pendingReceiveNet);
        setPendingReceiveNet(null);
      }
    } else {
      setReceiveNet(null);
      setNetworkSearch('');
    }
  }, [activeModal, pendingReceiveNet]);

  if (!activeModal) return null;

  const selectedTx = selectedTxId
    ? transactions.find((t) => t.id === selectedTxId) ?? null
    : null;

  const defaultUsdt = tokens.find((t) => t.id === 'usdt') ?? tokens[0];
  const detailToken = tokens.find((t) => t.id === selectedTokenId) ?? defaultUsdt;

  const modalTitleMap: Record<Exclude<ActiveModal, null>, string> = {
    accounts: 'Wallets & Accounts',
    dapps: 'Connected dApps',
    search: 'Search Assets',
    history: selectedTx ? 'Transaction Details' : 'Transaction History',
    settings: 'Settings',
    receive: 'Receive Crypto',
    send: 'Send Crypto',
    binance: 'Deposit from Binance',
    buy: 'Buy Crypto',
    networks: 'Select Network',
    manage: 'Manage Crypto',
    token_detail: selectedTx ? 'Transaction Details' : `${detailToken.name} (${detailToken.symbol})`,
    admin: 'Admin Portal',
  };

  const receiveAddress = receiveNet ? activeAccount.addresses[receiveNet] : '';

  const formatShortAddress = (addr: string) => {
    if (addr.length <= 14) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const handleCopyNetworkRow = async (netId: Exclude<NetworkId, 'all'>, addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
    } catch {
      // Clipboard fallback in restricted frames
    }
    setCopiedNetId(netId);
    setTimeout(() => setCopiedNetId((prev) => (prev === netId ? null : prev)), 1800);
  };

  const handleCopyText = async (text: string, which: 'addr' | 'hash') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard fallback in restricted frames
    }
    if (which === 'addr') {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 1800);
    } else {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1800);
    }
  };

  const filteredSearchTokens = tokens.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedBuyToken = tokens.find((t) => t.id === buyTokenId) ?? tokens[1];
  const parsedBuyUsd = Math.max(0, parseFloat(buyUsdAmount) || 0);
  const estimatedBuyQty = parsedBuyUsd / selectedBuyToken.priceUsd;

  const selectedBinanceToken = tokens.find((t) => t.id === binanceTokenId) ?? defaultUsdt;
  const parsedBinanceQty = Math.max(0, parseFloat(binanceAmount) || 0);

  const sendToken = tokens.find((t) => t.id === sendTokenId) ?? defaultUsdt;
  const sendBalance = activeAccount.balances[sendToken.id] ?? 0;
  const parsedSendAmount = Math.max(0, parseFloat(sendAmount) || 0);
  const sendInvalid =
    parsedSendAmount <= 0 || parsedSendAmount > sendBalance || sendRecipient.trim().length < 8;

  const detailTokenBalance = activeAccount.balances[detailToken.id] ?? 0;
  const detailTransactions = transactions.filter(
    (tx) =>
      tx.tokenId === detailToken.id ||
      tx.amountText.toLowerCase().includes(detailToken.symbol.toLowerCase())
  );

  const renderTxReceipt = (tx: WalletTransaction) => {
    const isOutgoing = tx.amountText.startsWith('-');
    const isPending = tx.status === 'Pending';
    const net = NETWORKS.find((n) => n.id === tx.network);
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setSelectedTxId(null);
            onClearFocusedTx?.();
          }}
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0500FF] dark:text-[#6B85FF] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to list
        </button>

        <div className="p-4 rounded-2xl bg-[#F8F9FB] dark:bg-[#1A1E29] border border-[#ECEDF0] dark:border-[#232836] text-center">
          <div
            className={`text-[24px] font-bold tabular-nums ${
              isPending
                ? 'text-[#D97706] dark:text-[#FBBF24]'
                : isOutgoing
                  ? 'text-[#141416] dark:text-[#F4F5F7]'
                  : 'text-[#16A34A] dark:text-[#4ADE80]'
            }`}
          >
            {tx.amountText}
          </div>
          <div className="text-[13px] text-[#717680] dark:text-[#8E95A5] tabular-nums mt-0.5">{tx.usdText}</div>
          <div
            className={`mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold ${
              isPending ? 'text-[#D97706] dark:text-[#FBBF24]' : 'text-[#16A34A] dark:text-[#4ADE80]'
            }`}
          >
            {isPending ? <Clock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            {isPending && tx.confirmations !== undefined && tx.confirmationsRequired !== undefined
              ? `Pending (${tx.confirmations}/${tx.confirmationsRequired} confirmations)`
              : tx.status}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ECEDF0] dark:border-[#232836] divide-y divide-[#F1F2F5] dark:divide-[#232836] text-[12.5px]">
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
            <span className="text-[#717680] dark:text-[#8E95A5]">Date</span>
            <span className="font-medium text-[#141416] dark:text-[#F4F5F7]">{tx.timestamp}</span>
          </div>
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
            <span className="text-[#717680] dark:text-[#8E95A5]">Network</span>
            <span className="font-medium text-[#141416] dark:text-[#F4F5F7]">{net?.name ?? tx.network}</span>
          </div>
          {tx.counterparty && (
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <span className="text-[#717680] dark:text-[#8E95A5] shrink-0">
                {isOutgoing ? 'Recipient' : 'Sender'}
              </span>
              <span className="font-mono text-[11.5px] text-[#141416] dark:text-[#F4F5F7] truncate">
                {tx.counterparty}
              </span>
            </div>
          )}
          {tx.feeText && (
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <span className="text-[#717680] dark:text-[#8E95A5]">Network Fee</span>
              <span className="font-medium text-[#141416] dark:text-[#F4F5F7] tabular-nums">{tx.feeText}</span>
            </div>
          )}
          {tx.txHash && (
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <span className="text-[#717680] dark:text-[#8E95A5] shrink-0">Tx Hash</span>
              <button
                type="button"
                onClick={() => handleCopyText(tx.txHash!, 'hash')}
                className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-[#0500FF] dark:text-[#6B85FF] hover:underline truncate"
              >
                <span className="truncate">{tx.txHash.slice(0, 12)}...{tx.txHash.slice(-8)}</span>
                {copiedHash ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTxRow = (tx: WalletTransaction) => {
    const isOutgoing = tx.amountText.startsWith('-');
    const isPending = tx.status === 'Pending';
    return (
      <button
        key={tx.id}
        type="button"
        onClick={() => setSelectedTxId(tx.id)}
        className="w-full p-3 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] hover:bg-[#F8F9FB] dark:hover:bg-[#1C202B] transition-colors flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isPending
                ? 'bg-[#FEF3C7] dark:bg-[#3A2B12] text-[#D97706] dark:text-[#FBBF24]'
                : isOutgoing
                  ? 'bg-[#FEF2F2] dark:bg-[#3A1A1D] text-[#DC2626] dark:text-[#F87171]'
                  : 'bg-[#ECFDF5] dark:bg-[#133323] text-[#16A34A] dark:text-[#4ADE80]'
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
            <div className="text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7] truncate">
              {tx.title}
            </div>
            <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5] truncate">
              {tx.subtitle} · {tx.timestamp}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 tabular-nums">
          <div
            className={`text-[13.5px] font-semibold ${
              isPending
                ? 'text-[#D97706] dark:text-[#FBBF24]'
                : isOutgoing
                  ? 'text-[#DC2626] dark:text-[#F87171]'
                  : 'text-[#16A34A] dark:text-[#4ADE80]'
            }`}
          >
            {tx.amountText}
          </div>
          <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5]">{tx.usdText}</div>
        </div>
      </button>
    );
  };

  if (activeModal === 'receive') {
    const query = networkSearch.trim().toLowerCase();
    const matchingNetworks = NETWORKS.filter(
      (net) =>
        net.name.toLowerCase().includes(query) ||
        net.symbol.toLowerCase().includes(query) ||
        net.shortName.toLowerCase().includes(query)
    );
    const popularNetworks = matchingNetworks.filter((net) => net.section !== 'az');
    const azNetworks = matchingNetworks.filter((net) => net.section === 'az');
    const activeReceiveInfo = receiveNet
      ? NETWORKS.find((n) => n.id === receiveNet)
      : null;

    const renderNetworkRow = (net: (typeof NETWORKS)[number]) => {
      const fullAddr = activeAccount.addresses[net.id];
      const isCopied = copiedNetId === net.id;

      return (
        <div
          key={net.id}
          className="flex items-center justify-between py-2.5 px-1.5 -mx-1.5 rounded-2xl hover:bg-[#F7F8FA] dark:hover:bg-[#1C202B] transition-colors"
        >
          <button
            type="button"
            onClick={() => setReceiveNet(net.id)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            <NetworkLogoIcon networkId={net.id} className="w-9 h-9" />
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-[#141416] dark:text-[#F4F5F7] leading-tight truncate">
                {net.name}
              </div>
              <div className="text-[13px] text-[#717680] dark:text-[#8E95A5] leading-tight mt-0.5 tabular-nums truncate">
                {formatShortAddress(fullAddr)}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setReceiveNet(net.id)}
              title={`Show ${net.name} QR code`}
              aria-label={`Show ${net.name} QR code`}
              className="w-9 h-9 rounded-full hover:bg-[#EFEFF2] dark:hover:bg-[#252A38] flex items-center justify-center text-[#141416] dark:text-[#F4F5F7] transition-colors"
            >
              <QrCode className="w-[18px] h-[18px]" strokeWidth={1.9} />
            </button>
            <button
              type="button"
              onClick={() => handleCopyNetworkRow(net.id, fullAddr)}
              title={`Copy ${net.name} address`}
              aria-label={`Copy ${net.name} address`}
              className="w-9 h-9 rounded-full hover:bg-[#EFEFF2] dark:hover:bg-[#252A38] flex items-center justify-center text-[#7B808C] dark:text-[#8E95A5] hover:text-[#141416] dark:hover:text-[#F4F5F7] transition-colors"
            >
              {isCopied ? (
                <Check className="w-[18px] h-[18px] text-[#16A34A] dark:text-[#4ADE80]" strokeWidth={2.2} />
              ) : (
                <Copy className="w-[17px] h-[17px]" strokeWidth={1.9} />
              )}
            </button>
          </div>
        </div>
      );
    };

    return (
      <div
        className="absolute inset-0 z-40 bg-white dark:bg-[#14171F] flex flex-col animate-[slideUp_160ms_cubic-bezier(0.16,1,0.3,1)] transition-colors"
        role="dialog"
        aria-modal="true"
        aria-label={activeReceiveInfo ? `Receive ${activeReceiveInfo.name}` : 'Select network'}
      >
        {/* Top Bar matching screenshot */}
        <div className="px-4 pt-3 pb-2.5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              if (receiveNet) {
                setReceiveNet(null);
              } else {
                onClose();
              }
            }}
            aria-label="Go back"
            className="w-9 h-9 rounded-[11px] bg-[#EFEFF5] dark:bg-[#1C202B] hover:bg-[#E4E5EE] dark:hover:bg-[#252A38] flex items-center justify-center text-[#7B808C] dark:text-[#8E95A5] hover:text-[#141416] dark:hover:text-[#F4F5F7] transition-colors"
          >
            <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2.1} />
          </button>

          <h3 className="text-[16px] font-bold text-[#141416] dark:text-[#F4F5F7] tracking-[-0.01em]">
            {activeReceiveInfo ? `Receive ${activeReceiveInfo.name}` : 'Select network'}
          </h3>

          <div className="w-9 h-9 shrink-0" aria-hidden="true" />
        </div>

        {!receiveNet ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Pill */}
            <div className="px-4 pt-1 pb-3 shrink-0">
              <div className="h-[40px] rounded-full bg-[#EFEFF2] dark:bg-[#1C202B] px-3.5 flex items-center gap-2.5">
                <Search className="w-[17px] h-[17px] text-[#7B808C] dark:text-[#8E95A5] shrink-0" strokeWidth={2} />
                <input
                  type="text"
                  value={networkSearch}
                  onChange={(e) => setNetworkSearch(e.target.value)}
                  placeholder="Search for network"
                  className="w-full bg-transparent text-[14px] text-[#141416] dark:text-[#F4F5F7] placeholder:text-[#8E939E] dark:placeholder:text-[#6B7280] focus:outline-none"
                />
              </div>
            </div>

            {/* Popular & A-Z networks list */}
            <div className="flex-1 overflow-y-auto wallet-scroll px-4 pb-4">
              {popularNetworks.length > 0 && (
                <div>
                  <div className="text-[13px] font-medium text-[#7B808C] dark:text-[#8E95A5] mb-2">
                    Popular networks
                  </div>
                  <div className="space-y-1">
                    {popularNetworks.map(renderNetworkRow)}
                  </div>
                </div>
              )}

              {azNetworks.length > 0 && (
                <div className={popularNetworks.length > 0 ? 'mt-4' : ''}>
                  <div className="text-[13px] font-medium text-[#7B808C] dark:text-[#8E95A5] mb-2">
                    A-Z networks
                  </div>
                  <div className="space-y-1">
                    {azNetworks.map(renderNetworkRow)}
                  </div>
                </div>
              )}

              {matchingNetworks.length === 0 && (
                <div className="py-10 text-center text-[13px] text-[#717680] dark:text-[#8E95A5]">
                  No matching networks found.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto wallet-scroll p-4 space-y-4">
            <div className="p-5 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-[#FAFAFC] dark:bg-[#1A1E29] flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <NetworkLogoIcon networkId={receiveNet} className="w-6 h-6" />
                <span className="text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7]">
                  {activeReceiveInfo?.name} Address
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#ECEDF0] dark:border-[#2D3343] shadow-xs">
                {receiveNet === 'ethereum' &&
                receiveAddress.toLowerCase() === '0x4b8f8e6b5017eac6a6fda7499fc935a15118e9e6' ? (
                  <img
                    src="/assets/aistudio/image_855a5dc4.png"
                    alt={`Ethereum QR code for ${receiveAddress}`}
                    className="w-44 h-44 object-contain rounded-lg select-none"
                  />
                ) : (
                  <QrMatrixSvg seed={receiveAddress} />
                )}
              </div>
              <p className="mt-3.5 text-[12px] font-mono text-[#141416] dark:text-[#F4F5F7] break-all text-center px-2">
                {receiveAddress}
              </p>
              <button
                type="button"
                onClick={() => handleCopyText(receiveAddress, 'addr')}
                className="mt-3.5 px-5 py-2.5 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedAddr ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedAddr ? 'Address Copied' : 'Copy Address'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const netToken = tokens.find((t) => t.network === receiveNet) ?? defaultUsdt;
                const demoQty = netToken.symbol === 'BTC' ? 0.015 : netToken.symbol === 'ETH' ? 0.25 : 250;
                onCreditAsset(
                  netToken.id,
                  demoQty,
                  'receive',
                  `Received ${demoQty} ${netToken.symbol} on ${activeReceiveInfo?.name ?? receiveNet}`
                );
                onClose();
              }}
              className="w-full h-11 rounded-xl bg-[#EEF0FF] dark:bg-[#1E2747] hover:bg-[#E0E4FF] dark:hover:bg-[#27335C] text-[#0500FF] dark:text-[#8FA4FF] text-[13px] font-semibold transition-colors"
            >
              Simulate Incoming Transfer
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-40 bg-black/40 dark:bg-black/65 backdrop-blur-[2px] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={modalTitleMap[activeModal]}
    >
      <div className="bg-white dark:bg-[#14171F] rounded-t-[24px] max-h-[88%] flex flex-col shadow-2xl border-t border-[#E8EAEE] dark:border-[#232836] animate-[slideUp_180ms_cubic-bezier(0.16,1,0.3,1)] transition-colors">
        {/* Sheet Header */}
        <div className="px-4 pt-2.5 pb-3 border-b border-[#ECEDF0] dark:border-[#232836] flex items-center justify-between shrink-0">
          <h3 className="text-[16px] font-bold text-[#141416] dark:text-[#F4F5F7] tracking-tight truncate pr-2">
            {modalTitleMap[activeModal]}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] flex items-center justify-center text-[#141416] dark:text-[#F4F5F7] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sheet Body */}
        <div className="p-4 overflow-y-auto wallet-scroll space-y-3">
          {activeModal === 'accounts' && (
            <>
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const isCurrent = acc.id === activeAccount.id;
                  const totalUsd = tokens.reduce(
                    (sum, t) => sum + (acc.balances[t.id] ?? 0) * t.priceUsd,
                    0
                  );
                  return (
                    <div
                      key={acc.id}
                      className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-colors ${
                        isCurrent
                          ? 'border-[#0500FF] dark:border-[#6B85FF] bg-[#F5F7FF] dark:bg-[#1B2138]'
                          : 'border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#1A1E29] hover:bg-[#F8F9FB] dark:hover:bg-[#222736]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAccount(acc.id);
                          onClose();
                        }}
                        className="flex-1 min-w-0 text-left flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] text-[#717680] dark:text-[#8E95A5]">{acc.seedGroup}</div>
                          <div className="text-[14.5px] font-bold text-[#141416] dark:text-[#F4F5F7] truncate">{acc.name}</div>
                          <div className="text-[11.5px] font-mono text-[#717680] dark:text-[#8E95A5] mt-0.5">
                            {acc.addresses.ethereum.slice(0, 8)}...{acc.addresses.ethereum.slice(-6)}
                          </div>
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <div className="text-[14px] font-bold text-[#141416] dark:text-[#F4F5F7]">
                            ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0500FF] dark:text-[#6B85FF]">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>
                      </button>
                      {accounts.length > 1 && onDeleteAccount && (
                        <button
                          type="button"
                          onClick={() => onDeleteAccount(acc.id)}
                          title={`Delete ${acc.name}`}
                          aria-label={`Delete ${acc.name}`}
                          className="w-8 h-8 rounded-full hover:bg-[#FEE2E2] dark:hover:bg-[#3A1A1D] text-[#717680] dark:text-[#8E95A5] hover:text-[#DC2626] dark:hover:text-[#F87171] flex items-center justify-center transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={onAddAccount}
                  className="flex-1 h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetAccountEmpty();
                    onClose();
                  }}
                  className="px-3.5 h-11 rounded-xl bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] text-[#141416] dark:text-[#F4F5F7] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Empty
                </button>
              </div>
            </>
          )}

          {activeModal === 'dapps' && (
            <div className="space-y-2.5">
              <p className="text-[12.5px] text-[#717680] dark:text-[#8E95A5]">
                Manage active Web3 browser &amp; WalletConnect sessions for{' '}
                <strong className="text-[#141416] dark:text-[#F4F5F7]">{activeAccount.name}</strong>.
              </p>
              {dapps.map((dapp) => {
                const net = NETWORKS.find((n) => n.id === dapp.network);
                return (
                  <div
                    key={dapp.id}
                    className="p-3 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#1A1E29] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#141416] dark:text-[#F4F5F7] truncate">
                        {dapp.name}
                      </div>
                      <div className="text-[12px] text-[#717680] dark:text-[#8E95A5] truncate">
                        {dapp.origin} · {net?.shortName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleDapp(dapp.id)}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        dapp.connected
                          ? 'bg-[#FEE2E2] dark:bg-[#3A1A1D] text-[#B91C1C] dark:text-[#F87171] hover:bg-[#FECACA] dark:hover:bg-[#4A2024]'
                          : 'bg-[#EEF0FF] dark:bg-[#1E2747] text-[#0500FF] dark:text-[#8FA4FF] hover:bg-[#E0E4FF] dark:hover:bg-[#27335C]'
                      }`}
                    >
                      {dapp.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeModal === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#717680] dark:text-[#8E95A5] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search token name or symbol..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[13.5px] text-[#141416] dark:text-[#F4F5F7] placeholder:text-[#8E939E] dark:placeholder:text-[#6B7280] focus:outline-none focus:border-[#0500FF] dark:focus:border-[#6B85FF]"
                />
              </div>

              <div className="divide-y divide-[#F1F2F5] dark:divide-[#232836]">
                {filteredSearchTokens.map((token) => {
                  const starred = watchlistIds.includes(token.id);
                  return (
                    <div key={token.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <TokenBadgeIcon
                          symbol={token.symbol}
                          networkId={token.network}
                          className="w-8 h-8"
                        />
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7] truncate">
                            {token.name}
                          </div>
                          <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5] tabular-nums">
                            {token.symbol} · {NETWORKS.find((n) => n.id === token.network)?.shortName ?? token.network} · ${token.priceUsd.toLocaleString('en-US')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleWatchlist(token.id)}
                          aria-label={`Toggle watchlist for ${token.symbol}`}
                          className="p-1.5 rounded-full hover:bg-[#F3F4F6] dark:hover:bg-[#1C202B]"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              starred ? 'fill-[#F0B90B] text-[#F0B90B]' : 'text-[#9CA3AF] dark:text-[#6B7280]'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBuyTokenId(token.id);
                            onCreditAsset(
                              token.id,
                              Number((100 / token.priceUsd).toFixed(5)),
                              'buy',
                              `Quick bought $100 of ${token.symbol}`
                            );
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#EEF0FF] dark:bg-[#1E2747] text-[#0500FF] dark:text-[#8FA4FF] text-[12px] font-semibold hover:bg-[#E0E4FF] dark:hover:bg-[#27335C]"
                        >
                          +$100
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeModal === 'history' && (
            <div className="space-y-2.5">
              {selectedTx ? (
                renderTxReceipt(selectedTx)
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTxTracker((v) => !v);
                        setTrackError(null);
                      }}
                      className="text-[12px] font-semibold text-[#0500FF] dark:text-[#6B85FF] hover:underline"
                    >
                      {showTxTracker ? 'Hide Tx Tracker' : '+ Track On-Chain Tx Hash'}
                    </button>
                    {onRefreshPayments && (
                      <button
                        type="button"
                        onClick={onRefreshPayments}
                        disabled={isSyncingPayments}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] text-[12px] font-semibold text-[#141416] dark:text-[#F4F5F7] transition-colors disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isSyncingPayments ? 'animate-spin text-[#0500FF] dark:text-[#6B85FF]' : ''}`}
                        />
                        {isSyncingPayments ? 'Syncing...' : 'Sync On-Chain'}
                      </button>
                    )}
                  </div>

                  {showTxTracker && onTrackTxHash && (
                    <div className="p-3 rounded-2xl bg-[#F8F9FB] dark:bg-[#1A1E29] border border-[#ECEDF0] dark:border-[#232836] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={trackNetwork}
                          onChange={(e) => {
                            const netId = e.target.value as Exclude<NetworkId, 'all'>;
                            setTrackNetwork(netId);
                            const info = NETWORKS.find((n) => n.id === netId);
                            if (info) {
                              setTrackTokenType(netId === 'bsc' || netId === 'ethereum' || netId === 'tron' ? 'USDT' : info.symbol);
                            }
                          }}
                          className="px-2.5 py-2 rounded-xl bg-white dark:bg-[#14171F] border border-[#E5E7EB] dark:border-[#2D3343] text-[12px] font-semibold text-[#141416] dark:text-[#F4F5F7]"
                        >
                          {NETWORKS.map((net) => (
                            <option key={net.id} value={net.id}>
                              {net.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={trackTokenType}
                          onChange={(e) => setTrackTokenType(e.target.value)}
                          placeholder="USDT or NATIVE"
                          className="px-2.5 py-2 rounded-xl bg-white dark:bg-[#14171F] border border-[#E5E7EB] dark:border-[#2D3343] text-[12px] font-semibold text-[#141416] dark:text-[#F4F5F7]"
                        />
                      </div>
                      <input
                        type="text"
                        value={trackHashInput}
                        onChange={(e) => {
                          setTrackHashInput(e.target.value);
                          setTrackError(null);
                        }}
                        placeholder="Paste real on-chain txHash..."
                        className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#14171F] border border-[#E5E7EB] dark:border-[#2D3343] text-[12px] font-mono text-[#141416] dark:text-[#F4F5F7]"
                      />
                      {trackError && (
                        <div className="text-[11.5px] font-medium text-[#DC2626] dark:text-[#F87171]">{trackError}</div>
                      )}
                      <button
                        type="button"
                        disabled={trackSubmitting || !trackHashInput.trim()}
                        onClick={async () => {
                          setTrackSubmitting(true);
                          setTrackError(null);
                          try {
                            const res = await onTrackTxHash({
                              network: trackNetwork,
                              txHash: trackHashInput.trim(),
                              tokenType: trackTokenType.trim() || 'NATIVE',
                            });
                            if (!res.ok) {
                              setTrackError(res.error || 'Transaction not found on-chain');
                            } else {
                              setTrackHashInput('');
                              setShowTxTracker(false);
                            }
                          } catch {
                            setTrackError('Network error checking transaction');
                          } finally {
                            setTrackSubmitting(false);
                          }
                        }}
                        className="w-full h-9 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] disabled:bg-[#D1D5DB] dark:disabled:bg-[#232836] dark:disabled:text-[#6B7280] text-white text-[12.5px] font-semibold transition-colors"
                      >
                        {trackSubmitting ? 'Checking Blockchain...' : 'Verify & Track Live'}
                      </button>
                    </div>
                  )}

                  {transactions.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-[14px] font-semibold text-[#141416] dark:text-[#F4F5F7]">No transactions yet</p>
                      <p className="text-[12.5px] text-[#717680] dark:text-[#8E95A5] mt-1">
                        Receive, deposit from Binance, buy, send, or swap crypto to view activity here.
                      </p>
                    </div>
                  ) : (
                    transactions.map((tx) => renderTxRow(tx))
                  )}
                </>
              )}
            </div>
          )}

          {activeModal === 'token_detail' && (
            <div className="space-y-3.5">
              {selectedTx ? (
                renderTxReceipt(selectedTx)
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-[#F8F9FB] dark:bg-[#1A1E29] border border-[#ECEDF0] dark:border-[#232836] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TokenBadgeIcon
                        symbol={detailToken.symbol}
                        networkId={detailToken.network}
                        className="w-10 h-10"
                      />
                      <div>
                        <div className="text-[20px] font-bold text-[#141416] dark:text-[#F4F5F7] tabular-nums">
                          {detailTokenBalance.toLocaleString('en-US', { maximumFractionDigits: 5 })}{' '}
                          {detailToken.symbol}
                        </div>
                        <div className="text-[12.5px] text-[#717680] dark:text-[#8E95A5] tabular-nums">
                          ≈ $
                          {(detailTokenBalance * detailToken.priceUsd).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSendTokenId(detailToken.id);
                        onOpenModal('send');
                      }}
                      className="py-2.5 rounded-xl bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] text-[12.5px] font-semibold text-[#141416] dark:text-[#F4F5F7] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingReceiveNet(detailToken.network);
                        onOpenModal('receive');
                      }}
                      className="py-2.5 rounded-xl bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] text-[12.5px] font-semibold text-[#141416] dark:text-[#F4F5F7] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Receive
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBuyTokenId(detailToken.id);
                        onOpenModal('buy');
                      }}
                      className="py-2.5 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] text-[12.5px] font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Buy
                    </button>
                  </div>

                  <div>
                    <div className="text-[13px] font-bold text-[#141416] dark:text-[#F4F5F7] mb-2">
                      {detailToken.symbol} History ({detailTransactions.length})
                    </div>
                    {detailTransactions.length === 0 ? (
                      <div className="py-6 text-center rounded-2xl border border-[#ECEDF0] dark:border-[#232836] text-[12.5px] text-[#717680] dark:text-[#8E95A5]">
                        No transactions recorded for {detailToken.symbol} yet.
                      </div>
                    ) : (
                      <div className="space-y-2">{detailTransactions.map((tx) => renderTxRow(tx))}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeModal === 'send' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
                  Asset
                </label>
                <select
                  value={sendTokenId}
                  onChange={(e) => setSendTokenId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7]"
                >
                  {tokens.map((t) => {
                    const bal = activeAccount.balances[t.id] ?? 0;
                    const label =
                      t.id === 'usdt'
                        ? 'USDT (ERC-20)'
                        : t.id === 'usdt-trc20'
                          ? 'USDT (TRC-20)'
                          : t.id === 'usdt-bep20'
                            ? 'USDT (BEP-20)'
                            : t.symbol;
                    return (
                      <option key={t.id} value={t.id}>
                        {label} — Balance: {bal.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={sendRecipient}
                  onChange={(e) => setSendRecipient(e.target.value)}
                  placeholder="0x... or wallet address"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[12.5px] font-mono text-[#141416] dark:text-[#F4F5F7] focus:outline-none focus:border-[#0500FF] dark:focus:border-[#6B85FF]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[12px] text-[#717680] dark:text-[#8E95A5] mb-1">
                  <span>Amount ({sendToken.symbol})</span>
                  <div className="flex items-center gap-2">
                    {sendBalance >= 20000 && (
                      <button
                        type="button"
                        onClick={() => setSendAmount('20000')}
                        className="text-[#0500FF] dark:text-[#6B85FF] font-semibold hover:underline"
                      >
                        20,000
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSendAmount(String(sendBalance))}
                      className="text-[#0500FF] dark:text-[#6B85FF] font-semibold hover:underline"
                    >
                      Max
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[16px] font-bold text-[#141416] dark:text-[#F4F5F7] tabular-nums focus:outline-none focus:border-[#0500FF] dark:focus:border-[#6B85FF]"
                />
                <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5] mt-1 tabular-nums">
                  ≈ ${(parsedSendAmount * sendToken.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <button
                type="button"
                disabled={sendInvalid}
                onClick={() => {
                  onSendAsset(sendToken.id, parsedSendAmount, sendRecipient.trim());
                  setSendAmount('');
                  onClose();
                }}
                className="w-full h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] disabled:bg-[#D1D5DB] dark:disabled:bg-[#232836] disabled:text-[#6B7280] dark:disabled:text-[#6B7280] text-white text-[13.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
                {parsedSendAmount > sendBalance
                  ? `Insufficient ${sendToken.symbol} balance`
                  : `Send ${parsedSendAmount > 0 ? parsedSendAmount.toLocaleString('en-US') : ''} ${sendToken.symbol}`}
              </button>
            </div>
          )}

          {activeModal === 'settings' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#1A1E29] flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7]">Appearance</div>
                  <div className="text-[12px] text-[#717680] dark:text-[#8E95A5]">Day &amp; Night display mode</div>
                </div>
                <div className="flex gap-1 bg-[#EFEFF2] dark:bg-[#14171F] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => onChangeTheme('light')}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1 transition-colors ${
                      theme === 'light'
                        ? 'bg-white text-[#141416] shadow-sm'
                        : 'text-[#717680] dark:text-[#8E95A5]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeTheme('dark')}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1 transition-colors ${
                      theme === 'dark'
                        ? 'bg-[#252A38] text-[#F4F5F7] shadow-sm'
                        : 'text-[#717680] dark:text-[#8E95A5]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Night
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#1A1E29] flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7]">Display Currency</div>
                  <div className="text-[12px] text-[#717680] dark:text-[#8E95A5]">Fiat conversion unit</div>
                </div>
                <div className="flex gap-1 bg-[#EFEFF2] dark:bg-[#14171F] p-1 rounded-xl">
                  {(['USD', 'EUR'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => onChangeCurrency(curr)}
                      className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors ${
                        currency === curr
                          ? 'bg-white dark:bg-[#252A38] text-[#141416] dark:text-[#F4F5F7] shadow-sm'
                          : 'text-[#717680] dark:text-[#8E95A5]'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#1A1E29] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0500FF] dark:text-[#6B85FF]" />
                    <span className="text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7]">
                      Security &amp; Seed Backup
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSeedPreview((s) => !s)}
                    className="text-[12px] font-semibold text-[#0500FF] dark:text-[#6B85FF] hover:underline"
                  >
                    {showSeedPreview ? 'Hide' : 'Reveal Demo'}
                  </button>
                </div>
                {showSeedPreview && (
                  <div className="p-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#14171F] text-[11.5px] font-mono text-[#141416] dark:text-[#F4F5F7] leading-relaxed">
                    1. harbor 2. velvet 3. orbit 4. kinetic 5. timber 6. canvas 7. prism 8. summit 9. amber 10. signal 11. beacon 12. trust
                  </div>
                )}
              </div>

              <PWAInstallButton variant="card" />

              <button
                type="button"
                onClick={() => onOpenModal('admin')}
                className="w-full h-11 rounded-xl bg-[#EEF0FF] dark:bg-[#1E2747] hover:bg-[#E0E4FF] dark:hover:bg-[#27335C] text-[#0500FF] dark:text-[#8FA4FF] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Lock className="w-4 h-4" />
                {adminSession ? 'Open Admin Console' : 'Admin Login'}
              </button>

              <button
                type="button"
                onClick={() => {
                  onResetAccountEmpty();
                  onClose();
                }}
                className="w-full h-11 rounded-xl bg-[#EFEFF2] dark:bg-[#1C202B] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38] text-[#141416] dark:text-[#F4F5F7] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset {activeAccount.name} to Empty State
              </button>
            </div>
          )}

          {activeModal === 'admin' && (
            <AdminPanel
              adminToken={adminToken}
              adminSession={adminSession}
              onAuthChange={onAdminAuthChange}
              activeAccount={activeAccount}
              tokens={tokens}
              onCreditAsset={onCreditAsset}
              onResetAccountEmpty={onResetAccountEmpty}
              onNotify={onNotify}
            />
          )}

          {activeModal === 'binance' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#2B2310] border border-[#FDE68A] dark:border-[#5C4716] flex items-center gap-3">
                <BinanceIcon className="w-7 h-7 shrink-0" />
                <p className="text-[12.5px] text-[#78350F] dark:text-[#FCD34D]">
                  Transfer funds directly from your Binance account with zero manual address entry.
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
                  Asset to Deposit
                </label>
                <select
                  value={binanceTokenId}
                  onChange={(e) => setBinanceTokenId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7]"
                >
                  {tokens.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
                  Amount ({selectedBinanceToken.symbol})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={binanceAmount}
                  onChange={(e) => setBinanceAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[15px] font-bold text-[#141416] dark:text-[#F4F5F7] tabular-nums focus:outline-none focus:border-[#0500FF] dark:focus:border-[#6B85FF]"
                />
              </div>

              <button
                type="button"
                disabled={parsedBinanceQty <= 0}
                onClick={() => {
                  onCreditAsset(
                    selectedBinanceToken.id,
                    parsedBinanceQty,
                    'deposit',
                    `Deposited from Binance (${selectedBinanceToken.symbol})`
                  );
                  onClose();
                }}
                className="w-full h-11 rounded-xl bg-[#F0B90B] hover:bg-[#DDA908] text-[#141416] text-[13.5px] font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                Deposit {parsedBinanceQty > 0 ? parsedBinanceQty : ''} {selectedBinanceToken.symbol}
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeModal === 'buy' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-1.5">
                {['50', '100', '250', '500'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBuyUsdAmount(amt)}
                    className={`py-2 rounded-xl text-[13px] font-semibold tabular-nums transition-colors ${
                      buyUsdAmount === amt
                        ? 'bg-[#0500FF] text-white'
                        : 'bg-[#EFEFF2] dark:bg-[#1C202B] text-[#141416] dark:text-[#F4F5F7] hover:bg-[#E4E5EA] dark:hover:bg-[#252A38]'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={buyUsdAmount}
                    onChange={(e) => setBuyUsdAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[14px] font-bold text-[#141416] dark:text-[#F4F5F7] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
                    Token
                  </label>
                  <select
                    value={buyTokenId}
                    onChange={(e) => setBuyTokenId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F4F5F8] dark:bg-[#1C202B] border border-[#E5E7EB] dark:border-[#2D3343] text-[14px] font-bold text-[#141416] dark:text-[#F4F5F7]"
                  >
                    {tokens.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id === 'usdt'
                          ? 'USDT (ERC-20)'
                          : t.id === 'usdt-trc20'
                            ? 'USDT (TRC-20)'
                            : t.id === 'usdt-bep20'
                              ? 'USDT (BEP-20)'
                              : t.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#717680] dark:text-[#8E95A5] mb-1">
                  Payment Provider
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['MoonPay', 'Ramp', 'Transak'] as const).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setBuyProvider(prov)}
                      className={`py-2 rounded-xl text-[12.5px] font-semibold border transition-colors ${
                        buyProvider === prov
                          ? 'border-[#0500FF] dark:border-[#6B85FF] bg-[#EEF0FF] dark:bg-[#1E2747] text-[#0500FF] dark:text-[#8FA4FF]'
                          : 'border-[#ECEDF0] dark:border-[#232836] bg-white dark:bg-[#1A1E29] text-[#525866] dark:text-[#8E95A5]'
                      }`}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F9FB] dark:bg-[#1A1E29] border border-[#ECEDF0] dark:border-[#232836] flex items-center justify-between text-[12.5px]">
                <span className="text-[#717680] dark:text-[#8E95A5]">You receive est.</span>
                <strong className="text-[#141416] dark:text-[#F4F5F7] tabular-nums">
                  {estimatedBuyQty.toFixed(5)} {selectedBuyToken.symbol}
                </strong>
              </div>

              <button
                type="button"
                disabled={parsedBuyUsd <= 0}
                onClick={() => {
                  onCreditAsset(
                    selectedBuyToken.id,
                    Number(estimatedBuyQty.toFixed(6)),
                    'buy',
                    `Bought via ${buyProvider}`
                  );
                  onClose();
                }}
                className="w-full h-11 rounded-xl bg-[#0500FF] hover:bg-[#0400D6] text-white text-[13.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Buy {selectedBuyToken.symbol} Now
              </button>
            </div>
          )}

          {activeModal === 'networks' && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  onSelectNetwork('all');
                  onClose();
                }}
                className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between text-[13.5px] font-semibold transition-colors ${
                  selectedNetwork === 'all'
                    ? 'bg-[#EEF0FF] dark:bg-[#1E2747] text-[#0500FF] dark:text-[#8FA4FF]'
                    : 'hover:bg-[#F8F9FB] dark:hover:bg-[#1C202B] text-[#141416] dark:text-[#F4F5F7]'
                }`}
              >
                <span>All Networks</span>
                {selectedNetwork === 'all' && <Check className="w-4 h-4" />}
              </button>
              {NETWORKS.map((net) => {
                const active = selectedNetwork === net.id;
                return (
                  <button
                    key={net.id}
                    type="button"
                    onClick={() => {
                      onSelectNetwork(net.id);
                      onClose();
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between text-[13.5px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#EEF0FF] dark:bg-[#1E2747] text-[#0500FF] dark:text-[#8FA4FF]'
                        : 'hover:bg-[#F8F9FB] dark:hover:bg-[#1C202B] text-[#141416] dark:text-[#F4F5F7]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <NetworkLogoIcon networkId={net.id} className="w-6 h-6" />
                      <span>{net.name}</span>
                    </div>
                    {active && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          )}

          {activeModal === 'manage' && (
            <div className="divide-y divide-[#F1F2F5] dark:divide-[#232836]">
              {tokens.map((token) => {
                const enabled = activeAccount.enabledTokenIds.includes(token.id);
                return (
                  <div key={token.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <TokenBadgeIcon
                        symbol={token.symbol}
                        networkId={token.network}
                        className="w-8 h-8"
                      />
                      <div>
                        <div className="text-[13.5px] font-semibold text-[#141416] dark:text-[#F4F5F7]">
                          {token.symbol}
                        </div>
                        <div className="text-[11.5px] text-[#717680] dark:text-[#8E95A5]">{token.name}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => onToggleTokenEnabled(token.id)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        enabled ? 'bg-[#0500FF]' : 'bg-[#D1D5DB] dark:bg-[#2D3343]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
