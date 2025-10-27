import "./global.css";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import ConsolePage from "./pages/Console";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function RootRedirector() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/console", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <Layout>
                  <Index />
                </Layout>
              }
            />
            <Route
              path="/login"
              element={
                <LoginPage />
              }
            />
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
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
