import React, { createContext, useState, useContext, useEffect } from "react";
import { base44, _resetCachedClubId } from "@/api/base44Client";
import { supabase } from "@/integrations/supabase/client";

// Reuse one context across hot reloads so an edit never strands consumers on a stale copy.
const AuthContext = globalThis.__crAuthContext || (globalThis.__crAuthContext = createContext());

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAppState();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        _resetCachedClubId();
        checkAppState();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const logout = () => base44.auth.logout();
  const navigateToLogin = () => base44.auth.redirectToLogin(window.location.href);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings: false,
      authError: null, appPublicSettings: null, logout, navigateToLogin, checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
