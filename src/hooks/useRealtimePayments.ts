import { useCallback, useEffect, useRef, useState } from 'react';
import { NetworkId, WalletTransaction } from '../types/wallet';

export interface RealtimePaymentPayload extends WalletTransaction {
  applyBalance?: boolean;
}

export interface LivePriceEntry {
  priceUsd: number;
  change24h: number;
}

interface UseRealtimePaymentsOptions {
  addresses: Record<Exclude<NetworkId, 'all'>, string>;
  onInitOrSync: (payments: RealtimePaymentPayload[]) => void;
  onPaymentEvent: (
    payment: RealtimePaymentPayload,
    mode: 'created' | 'updated'
  ) => void;
  onPricesUpdate?: (prices: Record<string, LivePriceEntry>) => void;
}

export function useRealtimePayments({
  addresses,
  onInitOrSync,
  onPaymentEvent,
  onPricesUpdate,
}: UseRealtimePaymentsOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(1200);
  const onInitOrSyncRef = useRef(onInitOrSync);
  const onPaymentEventRef = useRef(onPaymentEvent);
  const onPricesUpdateRef = useRef(onPricesUpdate);
  const addressesRef = useRef(addresses);

  onInitOrSyncRef.current = onInitOrSync;
  onPaymentEventRef.current = onPaymentEvent;
  onPricesUpdateRef.current = onPricesUpdate;
  addressesRef.current = addresses;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/prices')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.ok && json.prices) {
          onPricesUpdateRef.current?.(json.prices);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/payments`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          retryDelayRef.current = 1200;
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              addresses: addressesRef.current,
            })
          );
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(String(evt.data));
            if (msg?.type === 'payment:init' || msg?.type === 'payment:synced') {
              if (Array.isArray(msg.payments)) {
                onInitOrSyncRef.current(msg.payments);
              }
            } else if (msg?.type === 'payment:created' && msg.payment) {
              onPaymentEventRef.current(msg.payment, 'created');
            } else if (msg?.type === 'payment:updated' && msg.payment) {
              onPaymentEventRef.current(msg.payment, 'updated');
            } else if (msg?.type === 'prices:update' && msg.prices) {
              onPricesUpdateRef.current?.(msg.prices);
            }
          } catch {
            // Ignore malformed socket messages
          }
        };

        ws.onclose = () => {
          if (disposed) return;
          const delay = Math.min(retryDelayRef.current, 15000);
          retryDelayRef.current = Math.min(delay * 1.6, 15000);
          reconnectTimerRef.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // Retry via backoff timer
      }
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Re-subscribe whenever the active account's addresses change
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', addresses }));
    }
  }, [addresses]);

  const refreshNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [payRes, priceRes] = await Promise.all([
        fetch('/api/payments/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses: addressesRef.current }),
        }),
        fetch('/api/prices'),
      ]);
      const [payJson, priceJson] = await Promise.all([payRes.json(), priceRes.json()]);
      if (payRes.ok && Array.isArray(payJson?.payments)) {
        onInitOrSyncRef.current(payJson.payments);
      }
      if (priceRes.ok && priceJson?.prices) {
        onPricesUpdateRef.current?.(priceJson.prices);
      }
    } catch {
      // Network offline or transient error handled gracefully
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const trackTxHash = useCallback(
    async ({
      network,
      txHash,
      tokenType,
      memoOrTag,
    }: {
      network: string;
      txHash: string;
      tokenType?: string;
      memoOrTag?: string;
    }) => {
      const res = await fetch('/api/payments/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, txHash, tokenType, memoOrTag }),
      });
      const json = await res.json();
      if (json?.payment) {
        onPaymentEventRef.current(
          json.payment,
          json.status === 'pending' ? 'created' : 'updated'
        );
      }
      return { httpStatus: res.status, ...json };
    },
    []
  );

  return {
    isSyncing,
    refreshNow,
    trackTxHash,
  };
}
