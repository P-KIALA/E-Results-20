import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, MapPin, LogOut } from "lucide-react";
import { useState } from "react";

export default function Sidebar() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const isActive = (path: string) => location.pathname === path;

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-64px)] bg-background border-r border-border flex flex-col gap-1 p-2 overflow-hidden transition-all duration-300 ease-in-out",
        isHovered ? "w-56" : "w-20"
      )}
    >
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
