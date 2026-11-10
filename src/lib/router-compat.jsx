// Small bridge that gives the imported pages the navigation helpers they expect,
// powered by TanStack Router underneath.
import React from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";

function useNav() {
  const router = useRouter();
  return React.useCallback((to, opts = {}) => {
    if (typeof to === "number") { window.history.go(to); return; }
    const href = typeof to === "string" ? to : `${to.pathname || ""}${to.search || ""}${to.hash || ""}`;
    router.history[opts.replace ? "replace" : "push"](href, opts.state);
  }, [router]);
}

export function useNavigate() { return useNav(); }

export function useLocation() {
  const loc = useRouterState({ select: (s) => s.location });
  return {
    pathname: loc.pathname,
    search: loc.searchStr ?? "",
    hash: loc.hash ? `#${loc.hash}` : "",
    state: loc.state?.__legacy ?? loc.state ?? null,
    key: loc.state?.key ?? "default",
  };
}

export function useSearchParams() {
  const { search } = useLocation();
  const navigate = useNav();
  const params = React.useMemo(() => new URLSearchParams(search), [search]);
  const set = React.useCallback((next, opts) => {
    const v = typeof next === "function" ? next(new URLSearchParams(search)) : next;
    const qs = new URLSearchParams(v).toString();
    navigate(`${window.location.pathname}${qs ? `?${qs}` : ""}`, opts);
  }, [search, navigate]);
  return [params, set];
}

export const RouteParamsContext = React.createContext({});
export const OutletContext = React.createContext(null);
export function useParams() { return React.useContext(RouteParamsContext); }

export const Link = React.forwardRef(function Link({ to, replace, state, onClick, children, ...rest }, ref) {
  const navigate = useNav();
  const href = typeof to === "string" ? to : `${to?.pathname || ""}${to?.search || ""}`;
  return (
    <a ref={ref} href={href} {...rest} onClick={(e) => {
      onClick?.(e);
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || rest.target === "_blank" || /^https?:/.test(href)) return;
      e.preventDefault();
      navigate(href, { replace, state });
    }}>{children}</a>
  );
});

export const NavLink = Link;

export function Navigate({ to, replace }) {
  const navigate = useNav();
  React.useEffect(() => { navigate(to, { replace }); }, [to]);
  return null;
}

export function Outlet() { return React.useContext(OutletContext); }
export function useNavigationType() { return "PUSH"; }
