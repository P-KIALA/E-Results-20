import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { LogOut, User, Settings } from "lucide-react";

export default function Header() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 3a9 9 0 1 0 9 9"
                stroke="currentColor"
                className="text-primary"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 3v6l4 2"
                stroke="currentColor"
                className="text-primary"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-extrabold text-lg tracking-tight">
            E-Result
          </span>
        </Link>

        {isAuthenticated && (
          <nav className="hidden gap-6 md:flex">
            {user?.role === "admin" ? (
              <>
                <Link
                  to="/console"
                  className={cn(
                    "text-sm transition-colors hover:text-foreground/80",
                    isActive("/console")
                      ? "text-foreground"
                      : "text-foreground/60",
                  )}
                >
                  Console
                </Link>
                <Link
                  to="/admin"
                  className={cn(
                    "text-sm transition-colors hover:text-foreground/80",
                    isActive("/admin")
                      ? "text-foreground"
                      : "text-foreground/60",
                  )}
                >
                  Utilisateurs
                </Link>
                <Link
                  to="/sites"
                  className={cn(
                    "text-sm transition-colors hover:text-foreground/80",
                    isActive("/sites")
                      ? "text-foreground"
                      : "text-foreground/60",
                  )}
                >
                  Sites
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                className={cn(
                  "text-sm transition-colors hover:text-foreground/80",
                  isActive("/dashboard")
                    ? "text-foreground"
                    : "text-foreground/60",
                )}
              >
                Envois
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User size={16} className="text-primary" />
                <span>{user?.email}</span>
                <span className="text-muted-foreground">
                  ({user?.role === "admin" ? "Admin" : "Utilisateur"})
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={logout}
                className="gap-2"
              >
                <LogOut size={16} /> Déconnexion
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Connexion</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
