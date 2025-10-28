import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, MapPin, LogOut, Stethoscope, Send, Clock, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout, isAuthenticated } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
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
        : "text-foreground hover:bg-muted/60 hover:text-primary"
    );

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-64px)] bg-background border-r border-border flex flex-col gap-1 p-2 overflow-y-auto transition-all duration-300 ease-in-out",
        isMinimized ? "w-20" : "w-56"
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
            to="/console"
            className={navItemClass(isActive("/console"))}
            title="Console"
          >
            <LayoutDashboard size={20} className="flex-shrink-0" />
            {isHovered && <span className="font-medium">Console</span>}
          </Link>

          {isHovered && isActive("/console") && (
            <div className="flex flex-col gap-1 pl-2 border-l-2 border-primary/30">
              <Link
                to="/console?tab=doctors"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                  "text-sm text-foreground hover:bg-muted/60 hover:text-primary"
                )}
                title="Médecins"
              >
                <Stethoscope size={16} className="flex-shrink-0" />
                <span>Médecins</span>
              </Link>
              <Link
                to="/console?tab=results"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                  "text-sm text-foreground hover:bg-muted/60 hover:text-primary"
                )}
                title="Envoi résultat"
              >
                <Send size={16} className="flex-shrink-0" />
                <span>Envoi résultat</span>
              </Link>
              <Link
                to="/console?tab=history"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                  "text-sm text-foreground hover:bg-muted/60 hover:text-primary"
                )}
                title="Historique"
              >
                <Clock size={16} className="flex-shrink-0" />
                <span>Historique</span>
              </Link>
              <Link
                to="/console?tab=stats"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                  "text-sm text-foreground hover:bg-muted/60 hover:text-primary"
                )}
                title="Statistiques"
              >
                <BarChart3 size={16} className="flex-shrink-0" />
                <span>Statistiques</span>
              </Link>
            </div>
          )}

          <Link
            to="/admin"
            className={navItemClass(isActive("/admin"))}
            title="Utilisateurs"
          >
            <Users size={20} className="flex-shrink-0" />
            {isHovered && <span className="font-medium">Utilisateurs</span>}
          </Link>

          <Link
            to="/sites"
            className={navItemClass(isActive("/sites"))}
            title="Sites"
          >
            <MapPin size={20} className="flex-shrink-0" />
            {isHovered && <span className="font-medium">Sites</span>}
          </Link>
        </>
      ) : (
        <Link
          to="/dashboard"
          className={navItemClass(isActive("/dashboard"))}
          title="Envois"
        >
          <LayoutDashboard size={20} className="flex-shrink-0" />
          {isHovered && <span className="font-medium">Envois</span>}
        </Link>
      )}

      <div className="flex-1" />

      <button
        onClick={logout}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "w-full text-left no-underline text-destructive",
          "hover:bg-destructive/10 hover:text-destructive font-semibold whitespace-nowrap"
        )}
        title="Déconnexion"
      >
        <LogOut size={20} className="flex-shrink-0" />
        {isHovered && <span>Déconnexion</span>}
      </button>
    </aside>
  );
}
