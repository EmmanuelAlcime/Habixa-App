/**
 * ConnectivityContext
 * Tracks internet connection status via NetInfo.
 * Emits connectionRestored when transitioning from offline to online.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface ConnectivityContextType {
  isConnected: boolean | null;
  connectionRestored: boolean;
  clearConnectionRestored: () => void;
}

const ConnectivityContext = createContext<ConnectivityContextType | null>(null);

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionRestored, setConnectionRestored] = useState(false);
  const wasOfflineRef = useRef(false);

  const clearConnectionRestored = useCallback(() => {
    setConnectionRestored(false);
  }, []);

  useEffect(() => {
    const updateState = (state: NetInfoState) => {
      const linked = state.isConnected;
      const reachable = state.isInternetReachable;
      // Show offline only when we're certain: link down AND no confirmed internet.
      // If isInternetReachable is true, trust it — avoid false "offline" on some devices.
      const offline = linked === false && reachable !== true;
      const connected = !offline;

      if (wasOfflineRef.current && connected) {
        setConnectionRestored(true);
        wasOfflineRef.current = false;
      } else if (offline) {
        wasOfflineRef.current = true;
      }

      setIsConnected(connected);
    };

    const unsubscribe = NetInfo.addEventListener(updateState);
    NetInfo.fetch().then(updateState);
    return () => unsubscribe();
  }, []);

  const value: ConnectivityContextType = {
    isConnected,
    connectionRestored,
    clearConnectionRestored,
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error('useConnectivity must be used within ConnectivityProvider');
  return ctx;
}
