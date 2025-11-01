import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { authFetch } from "@/lib/api";

interface Site {
  id: string;
  name: string;
  address?: string;
}

interface SiteContextValue {
  sites: Site[];
  currentSiteId: string | null;
  setCurrentSiteId: (id: string | null) => void;
  canChangeSite: boolean;
  refreshSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSiteId, setCurrentSiteIdState] = useState<string | null>(
    (() => {
      try {
        return localStorage.getItem("current_site_id");
      } catch (e) {
        return null;
      }
    })(),
  );

  const canChangeSite =
    user?.role === "admin" || (user?.permissions || []).includes("access_all_sites");

  useEffect(() => {
    (async () => {
      await refreshSites();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!currentSiteId && user?.primary_site_id) {
      setCurrentSiteIdState(user.primary_site_id);
      try {
        localStorage.setItem("current_site_id", user.primary_site_id as string);
      } catch (e) {}
    }
  }, [user, currentSiteId]);

  const refreshSites = async () => {
    try {
      const res = await authFetch("/api/sites");
      if (!res || !res.ok) return;
      const data = await res.json();
      setSites(data.sites || []);
    } catch (e) {
      console.error("Failed to load sites", e);
    }
  };

  const setCurrentSiteId = (id: string | null) => {
    setCurrentSiteIdState(id);
    try {
      if (id) localStorage.setItem("current_site_id", id);
      else localStorage.removeItem("current_site_id");
    } catch (e) {}
  };

  return (
    <SiteContext.Provider value={{ sites, currentSiteId, setCurrentSiteId, canChangeSite, refreshSites }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const c = useContext(SiteContext);
  if (!c) {
    // Fallback to safe defaults to avoid throwing during SSR or early renders
    return {
      sites: [],
      currentSiteId: null,
      setCurrentSiteId: () => {},
      canChangeSite: false,
      refreshSites: async () => {},
    } as SiteContextValue;
  }
  return c;
}
