import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/lib/sidebar-context";
import { useTheme } from "next-themes";
import { User, Sun, Moon } from "lucide-react";

export default function Header() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { openMobile, setOpenMobile } = useSidebar();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden mr-2"
            onClick={() => setOpenMobile(true)}
            aria-label="Ouvrir le menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
              <path d="M3 12h18"></path>
              <path d="M3 6h18"></path>
              <path d="M3 18h18"></path>
            </svg>
          </Button>

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
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User size={16} className="text-primary" />
                <span>{user?.email}</span>
                <span className="text-muted-foreground">
                  ({user?.role === "admin" ? "Admin" : "Utilisateur"})
                </span>
              </div>
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
