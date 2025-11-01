import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/lib/sidebar-context";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  Users,
  MapPin,
  LogOut,
  Stethoscope,
  Send,
  Clock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout, isAuthenticated } = useAuth();
  const { isMinimized, setIsMinimized } = useSidebar();
  const isActive = (path: string) => location.pathname === path;
  const isConsoleActive = isActive("/console");
  const currentTab = searchParams.get("tab") || "doctors";

  if (!isAuthenticated) {
    return null;
  }

  const navItemClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
      "no-underline text-decoration-none whitespace-nowrap",
      active
        ? "bg-primary text-primary-foreground font-semibold"
        : "text-foreground hover:bg-muted/60 hover:text-primary",
    );

  const [sites, setSites] = useState<any[]>([]);
  const [chooseSiteOpen, setChooseSiteOpen] = useState(false);
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(localStorage.getItem("current_site_id") || null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/sites");
        if (!res.ok) return;
        const data = await res.json();
        setSites(data.sites || []);
      } catch (e) {
        console.error("Failed to load sites", e);
      }
    })();
  }, []);

  const currentSiteName = sites.find((s) => s.id === currentSiteId)?.name || null;
  const canChangeSite =
    user?.role === "admin" || (user?.permissions || []).includes("access_all_sites");

  const selectSite = (id: string) => {
    setCurrentSiteId(id);
    try {
      localStorage.setItem("current_site_id", id);
    } catch (e) {}
    setChooseSiteOpen(false);
    toast({ title: "Centre sélectionné", description: sites.find((s) => s.id === id)?.name || "" });
  };

  return (
    <>
      {/* Desktop sidebar: hidden on small screens */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-16 h-[calc(100vh-64px)] bg-background border-r border-border flex-col gap-1 p-2 overflow-y-auto transition-all duration-300 ease-in-out z-30",
          isMinimized ? "w-20" : "w-56",
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-full justify-center mb-2"
          title={isMinimized ? "Afficher le menu" : "Masquer le menu"}
        >
          {isMinimized ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
        {user?.role === "admin" ? (
          <>
            <Link
              to="/console?tab=doctors"
              className={navItemClass(
                isConsoleActive && currentTab === "doctors",
              )}
              title="Médecins"
            >
              <Stethoscope size={20} className="flex-shrink-0" />
              {!isMinimized && <span className="font-medium">Médecins</span>}
            </Link>

            <Link
              to="/console?tab=results"
              className={navItemClass(
                isConsoleActive && currentTab === "results",
              )}
              title="Envoi résultat"
            >
              <Send size={20} className="flex-shrink-0" />
              {!isMinimized && (
                <span className="font-medium">Envoi résultat</span>
              )}
            </Link>

            <Link
              to="/console?tab=history"
              className={navItemClass(
                isConsoleActive && currentTab === "history",
              )}
              title="Historique"
            >
              <Clock size={20} className="flex-shrink-0" />
              {!isMinimized && <span className="font-medium">Historique</span>}
            </Link>

            <Link
              to="/console?tab=stats"
              className={navItemClass(
                isConsoleActive && currentTab === "stats",
              )}
              title="Statistiques"
            >
              <BarChart3 size={20} className="flex-shrink-0" />
              {!isMinimized && (
                <span className="font-medium">Statistiques</span>
              )}
            </Link>

            <div className="my-2 border-t border-border" />

            <Link
              to="/admin"
              className={navItemClass(isActive("/admin"))}
              title="Utilisateurs"
            >
              <Users size={20} className="flex-shrink-0" />
              {!isMinimized && (
                <span className="font-medium">Utilisateurs</span>
              )}
            </Link>

            <Link
              to="/sites"
              className={navItemClass(isActive("/sites"))}
              title="Sites"
            >
              <MapPin size={20} className="flex-shrink-0" />
              {!isMinimized && <span className="font-medium">Sites</span>}
            </Link>

            <Link
              to="/report"
              className={navItemClass(isActive("/report"))}
              title="Rapport"
            >
              <BarChart3 size={20} className="flex-shrink-0" />
              {!isMinimized && <span className="font-medium">Rapport</span>}
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/dashboard"
              className={navItemClass(isActive("/dashboard"))}
              title="Envois"
            >
              <LayoutDashboard size={20} className="flex-shrink-0" />
              {!isMinimized && <span className="font-medium">Envois</span>}
            </Link>

            <Link
              to="/history"
              className={navItemClass(isActive("/history"))}
              title="Historique"
            >
              <Clock size={20} className="flex-shrink-0" />
              {!isMinimized && <span className="font-medium">Historique</span>}
            </Link>

            <Link
              to="/stats"
              className={navItemClass(isActive("/stats"))}
              title="Statistiques"
            >
              <BarChart3 size={20} className="flex-shrink-0" />
              {!isMinimized && (
                <span className="font-medium">Statistiques</span>
              )}
            </Link>

            <Link
              to="/report"
              className={navItemClass(isActive("/report"))}
              title="Rapport"
            >
              <BarChart3 size={20} className="flex-shrink-0" />
              {!isMinimized && <span className="font-medium">Rapport</span>}
            </Link>
          </>
        )}

        <div className="flex-1" />

        {user?.role === "admin" && (
          <>
            <button
              onClick={() => setChooseSiteOpen(true)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "w-full text-left no-underline text-foreground",
                "hover:bg-muted/60 hover:text-primary font-semibold whitespace-nowrap",
              )}
              title="Choisir le centre"
            >
              <MapPin size={20} className="flex-shrink-0" />
              {!isMinimized && (
                <span>{currentSiteName ? `Centre: ${currentSiteName}` : "Choisir centre"}</span>
              )}
            </button>

            {/* Choose site modal */}
            {chooseSiteOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/30" onClick={() => setChooseSiteOpen(false)} />
                <div className="relative z-10 w-11/12 sm:w-96 bg-white border rounded shadow p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Choisir un centre</h4>
                    <Button size="xs" variant="ghost" onClick={() => setChooseSiteOpen(false)}>Fermer</Button>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {sites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun centre trouvé</p>
                    ) : (
                      sites.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                          <div>
                            <div className="font-medium">{s.name}</div>
                            {s.address && <div className="text-xs text-muted-foreground">{s.address}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="xs" onClick={() => selectSite(s.id)}>
                              Sélectionner
                            </Button>
                            {currentSiteId === s.id && (
                              <span className="text-xs text-green-600">Actuel</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "w-full text-left no-underline text-destructive",
            "hover:bg-destructive/10 hover:text-destructive font-semibold whitespace-nowrap",
          )}
          title="Déconnexion"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!isMinimized && <span>Déconnexion</span>}
        </button>
      </aside>

      {/* Mobile drawer: slide-in left panel */}
      {/** Mobile off-canvas drawer - controlled by openMobile **/}
      <MobileDrawer />

      {/* Mobile bottom nav: visible only on small screens */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 md:hidden z-40">
        <nav className="bg-background/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 flex gap-3 items-center">
          {user?.role === "admin" ? (
            <>
              <Link
                to="/console?tab=doctors"
                className="flex flex-col items-center px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60"
              >
                <Stethoscope size={20} />
                <span className="mt-1 text-xs">Médecins</span>
              </Link>

              <Link
                to="/console?tab=results"
                className="flex flex-col items-center px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60"
              >
                <Send size={20} />
                <span className="mt-1 text-xs">Envoi</span>
              </Link>

              <Link
                to="/console?tab=history"
                className="flex flex-col items-center px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60"
              >
                <Clock size={20} />
                <span className="mt-1 text-xs">Historique</span>
              </Link>

              <Link
                to="/admin"
                className="flex flex-col items-center px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60"
              >
                <Users size={20} />
                <span className="mt-1 text-xs">Util.</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                className="flex flex-col items-center px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60"
              >
                <LayoutDashboard size={20} />
                <span className="mt-1 text-xs">Envois</span>
              </Link>

              <Link
                to="/history"
                className="flex flex-col items-center px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60"
              >
                <Clock size={20} />
                <span className="mt-1 text-xs">Historique</span>
              </Link>

              <Link
                to="/stats"
                className="flex flex-col items-center px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60"
              >
                <BarChart3 size={20} />
                <span className="mt-1 text-xs">Stats</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </>
  );
}

function MobileDrawer() {
  const { openMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isConsoleActive = location.pathname === "/console";
  const currentTab = searchParams.get("tab") || "doctors";

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${openMobile ? "" : "pointer-events-none"}`}
      aria-hidden={!openMobile}
    >
      {/* overlay */}
      <div
        onClick={() => setOpenMobile(false)}
        className={`absolute inset-0 bg-black/40 transition-opacity ${openMobile ? "opacity-100" : "opacity-0"}`}
      />

      {/* panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-background border-r border-border shadow-xl transform transition-transform ${openMobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center">
              E
            </div>
            <span className="font-semibold">Menu</span>
          </div>
          <button
            onClick={() => setOpenMobile(false)}
            aria-label="Fermer le menu"
            className="p-2 rounded-md hover:bg-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18"></path>
              <path d="M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="p-3 flex flex-col gap-1">
          {/* reuse auth info */}
          <MobileMenuItems setOpenMobile={setOpenMobile} />
        </div>
      </aside>
    </div>
  );
}

function MobileMenuItems({
  setOpenMobile,
}: {
  setOpenMobile: (v: boolean) => void;
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const isConsoleActive = location.pathname === "/console";
  const currentTab = searchParams.get("tab") || "doctors";

  const navItemClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
      "no-underline text-decoration-none whitespace-nowrap",
      active
        ? "bg-primary text-primary-foreground font-semibold"
        : "text-foreground hover:bg-muted/60 hover:text-primary",
    );

  return (
    <>
      {user?.role === "admin" ? (
        <>
          <Link
            onClick={() => setOpenMobile(false)}
            to="/console?tab=doctors"
            className={navItemClass(
              isConsoleActive && currentTab === "doctors",
            )}
          >
            <Stethoscope size={18} />
            <span>Médecins</span>
          </Link>

          <Link
            onClick={() => setOpenMobile(false)}
            to="/console?tab=results"
            className={navItemClass(
              isConsoleActive && currentTab === "results",
            )}
          >
            <Send size={18} />
            <span>Envoi résultat</span>
          </Link>

          <Link
            onClick={() => setOpenMobile(false)}
            to="/console?tab=history"
            className={navItemClass(
              isConsoleActive && currentTab === "history",
            )}
          >
            <Clock size={18} />
            <span>Historique</span>
          </Link>

          <Link
            onClick={() => setOpenMobile(false)}
            to="/console?tab=stats"
            className={navItemClass(isConsoleActive && currentTab === "stats")}
          >
            <BarChart3 size={18} />
            <span>Statistiques</span>
          </Link>

          <div className="my-2 border-t border-border" />

          <Link
            onClick={() => setOpenMobile(false)}
            to="/admin"
            className={navItemClass(location.pathname === "/admin")}
          >
            <Users size={18} />
            <span>Utilisateurs</span>
          </Link>

          <Link
            onClick={() => setOpenMobile(false)}
            to="/sites"
            className={navItemClass(location.pathname === "/sites")}
          >
            <MapPin size={18} />
            <span>Sites</span>
          </Link>

          <Link
            onClick={() => setOpenMobile(false)}
            to="/report"
            className={navItemClass(location.pathname === "/report")}
          >
            <BarChart3 size={18} />
            <span>Rapport</span>
          </Link>
        </>
      ) : (
        <>
          <Link
            onClick={() => setOpenMobile(false)}
            to="/dashboard"
            className={navItemClass(location.pathname === "/dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Envois</span>
          </Link>

          <Link
            onClick={() => setOpenMobile(false)}
            to="/history"
            className={navItemClass(location.pathname === "/history")}
          >
            <Clock size={18} />
            <span>Historique</span>
          </Link>

          <Link
            onClick={() => setOpenMobile(false)}
            to="/stats"
            className={navItemClass(location.pathname === "/stats")}
          >
            <BarChart3 size={18} />
            <span>Statistiques</span>
          </Link>

          <Link
            onClick={() => setOpenMobile(false)}
            to="/report"
            className={navItemClass(location.pathname === "/report")}
          >
            <BarChart3 size={18} />
            <span>Rapport</span>
          </Link>
        </>
      )}

      <div className="flex-1" />

      <button
        onClick={() => {
          logout();
          setOpenMobile(false);
        }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 w-full"
      >
        <LogOut size={18} />
        <span>Déconnexion</span>
      </button>
    </>
  );
}
