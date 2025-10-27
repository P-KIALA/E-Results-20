import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, MapPin, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-20 bg-muted/30 border-r flex flex-col gap-2 p-2 overflow-y-auto">
      {user?.role === "admin" ? (
        <>
          <Link to="/console" title="Console">
            <Button
              variant={isActive("/console") ? "default" : "ghost"}
              size="icon"
              className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-md"
            >
              <LayoutDashboard size={20} />
              <span className="text-xs text-center">Console</span>
            </Button>
          </Link>

          <Link to="/admin" title="Utilisateurs">
            <Button
              variant={isActive("/admin") ? "default" : "ghost"}
              size="icon"
              className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-md"
            >
              <Users size={20} />
              <span className="text-xs text-center">Users</span>
            </Button>
          </Link>

          <Link to="/sites" title="Sites">
            <Button
              variant={isActive("/sites") ? "default" : "ghost"}
              size="icon"
              className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-md"
            >
              <MapPin size={20} />
              <span className="text-xs text-center">Sites</span>
            </Button>
          </Link>
        </>
      ) : (
        <Link to="/dashboard" title="Envois">
          <Button
            variant={isActive("/dashboard") ? "default" : "ghost"}
            size="icon"
            className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-md"
          >
            <LayoutDashboard size={20} />
            <span className="text-xs text-center">Envois</span>
          </Button>
        </Link>
      )}

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={logout}
        className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Déconnexion"
      >
        <LogOut size={20} />
        <span className="text-xs text-center">Déco</span>
      </Button>
    </aside>
  );
}
