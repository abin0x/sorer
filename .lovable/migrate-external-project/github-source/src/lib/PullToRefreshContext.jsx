import React from "react";

// Allows any rendered page to register a refresh handler that the Layout's
// scroll-container pull-to-refresh gesture will invoke. Pages opt in by
// calling usePullToRefresh(asyncFn) — if no handler is registered for the
// current page, the gesture does nothing.
const PullToRefreshContext = React.createContext({
  registerRefresh: () => () => {},
  refreshRef: { current: null },
});

export function PullToRefreshProvider({ children }) {
  const refreshRef = React.useRef(null);

  const registerRefresh = React.useCallback((fn) => {
    refreshRef.current = fn;
    return () => {
      if (refreshRef.current === fn) refreshRef.current = null;
    };
  }, []);

  return (
    <PullToRefreshContext.Provider value={{ registerRefresh, refreshRef }}>
      {children}
    </PullToRefreshContext.Provider>
  );
}

// Hook for pages: pass an async refresh function (e.g. refetch active queries).
export function usePullToRefresh(fn) {
  const { registerRefresh } = React.useContext(PullToRefreshContext);
  React.useEffect(() => registerRefresh(fn), [fn, registerRefresh]);
}

export function usePullToRefreshRef() {
  return React.useContext(PullToRefreshContext).refreshRef;
}