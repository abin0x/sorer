import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, MessageSquare, Users, UserCircle } from "lucide-react";

// The five primary bottom-tab sections. rootPath is the entry page for each tab.
export const TABS = [
  { key: "home", label: "Home", icon: Home, rootPath: "/home" },
  { key: "schedule", label: "Schedule", icon: Calendar, rootPath: "/TeamCalendar" },
  { key: "messages", label: "Messages", icon: MessageSquare, rootPath: "/CommunicationPortal" },
  { key: "team", label: "Team", icon: Users, rootPath: "/Registration?tab=teams" },
  { key: "profile", label: "Profile", icon: UserCircle, rootPath: "/UserProfileView" },
];

export const ROOT_TAB_PATHS = new Set(TABS.map((t) => t.rootPath.split("?")[0]));

const STORAGE_KEY = "tabNavStacks";

function loadStacks() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStacks(stacks) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
  } catch {
    // ignore quota / privacy errors
  }
}

// Determine which tab "owns" a given pathname (longest matching base path wins).
export function owningTab(pathname) {
  let best = null;
  let bestLen = -1;
  for (const tab of TABS) {
    const base = tab.rootPath.split("?")[0];
    if (pathname === base || pathname.startsWith(base + "/")) {
      if (base.length > bestLen) {
        best = tab;
        bestLen = base.length;
      }
    }
  }
  return best;
}

const TabNavigationContext = React.createContext({ activeTab: null, navigateToTab: () => {} });

export function TabNavigationProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const stacksRef = React.useRef(loadStacks());
  const [activeTab, setActiveTab] = React.useState(null);

  // Track the active tab and persist the last path per tab so switching back
  // restores the exact sub-page the user left.
  React.useEffect(() => {
    const full = location.pathname + location.search;
    const owner = owningTab(location.pathname);
    if (owner) {
      setActiveTab(owner.key);
      if (stacksRef.current[owner.key] !== full) {
        stacksRef.current[owner.key] = full;
        saveStacks(stacksRef.current);
      }
    }
  }, [location.pathname, location.search]);

  const navigateToTab = React.useCallback(
    (tabKey) => {
      const tab = TABS.find((t) => t.key === tabKey);
      if (!tab) return;
      if (tabKey === activeTab) {
        // Tapping the already-active tab pops the stack back to the tab root.
        navigate(tab.rootPath);
        stacksRef.current[tabKey] = tab.rootPath;
        saveStacks(stacksRef.current);
      } else {
        const stored = stacksRef.current[tabKey] || tab.rootPath;
        navigate(stored);
      }
    },
    [activeTab, navigate]
  );

  return (
    <TabNavigationContext.Provider value={{ activeTab, navigateToTab, tabs: TABS }}>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation() {
  return React.useContext(TabNavigationContext);
}