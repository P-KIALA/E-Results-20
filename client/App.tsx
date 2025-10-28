import "./global.css";

import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import ConsolePage from "./pages/Console";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import SitesManagement from "./pages/SitesManagement";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const { isMinimized } = useSidebar();

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Global background for all pages. Replace '/console-bg.svg' as needed */}
      <div
        className="absolute inset-0 -z-10 bg-center bg-no-repeat bg-cover"
        style={{ backgroundImage: "url('/console-bg.svg')", opacity: 0.06 }}
      />

      <Header />
      <Sidebar />
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${isMinimized ? "ml-20" : "ml-56"}`}
      >
        {children}
      </main>
      <footer
        className={`transition-all duration-300 ease-in-out ${isMinimized ? "ml-20" : "ml-56"}`}
      >
        <Footer />
      </footer>
    </div>
  );
}

function RootRedirector() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!hasNavigated.current && location.pathname === "/") {
      hasNavigated.current = true;
      if (isAuthenticated) {
        navigate("/console", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SidebarProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirector />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/console"
                element={
                  <Layout>
                    <ProtectedRoute requiredRole="admin">
                      <ConsolePage />
                    </ProtectedRoute>
                  </Layout>
                }
              />
              <Route
                path="/admin"
                element={
                  <Layout>
                    <ProtectedRoute requiredRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  </Layout>
                }
              />
              <Route
                path="/sites"
                element={
                  <Layout>
                    <ProtectedRoute requiredRole="admin">
                      <SitesManagement />
                    </ProtectedRoute>
                  </Layout>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <Layout>
                    <ProtectedRoute requiredRole="user">
                      <UserDashboard />
                    </ProtectedRoute>
                  </Layout>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route
                path="*"
                element={
                  <Layout>
                    <NotFound />
                  </Layout>
                }
              />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

// Reuse existing root across HMR to avoid calling createRoot multiple times
const anyWindow = window as any;
if (!anyWindow.__app_root) {
  anyWindow.__app_root = createRoot(rootEl);
}
anyWindow.__app_root.render(<App />);
