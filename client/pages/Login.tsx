import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn, ChevronLeft, ChevronRight } from "lucide-react";

const images = [
  {
    url: "https://cdn.builder.io/api/v1/image/assets%2F9f25663a43a04697a461677adf38bba6%2Ff9c7cb1e4a764d218fcb1cb9f3dc9f93?format=webp&width=1600",
    alt: "cdf5",
  },
  {
    url: "https://cdn.builder.io/api/v1/image/assets%2F9f25663a43a04697a461677adf38bba6%2F7804ba7bee324b52877636d8cc5ab042?format=webp&width=1600",
    alt: "cdf8",
  },
  {
    url: "https://cdn.builder.io/api/v1/image/assets%2F9f25663a43a04697a461677adf38bba6%2F655c826405f74d1b9781b1f67e076ccd?format=webp&width=1600",
    alt: "cdf4",
  },
  {
    url: "https://cdn.builder.io/api/v1/image/assets%2F9f25663a43a04697a461677adf38bba6%2F52d5e24d3db04e29be69e6420d084c39?format=webp&width=1600",
    alt: "cdf3",
  },
  {
    url: "https://cdn.builder.io/api/v1/image/assets%2F9f25663a43a04697a461677adf38bba6%2F95eecb58f5f84b54b1b4a709d12a9e80?format=webp&width=1600",
    alt: "cdf2",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/console");
    } catch (err) {
      setError(String(err) || "Connexion échouée");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background Image Carousel */}
      <div className="absolute inset-0 -z-10">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
        ))}
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 py-12 flex-1 flex items-center justify-center relative z-10">
        {/* Left Side - Hero Content (hidden on small screens) */}
        <div className="hidden lg:block w-1/2 pr-8 space-y-8 text-white">
          <div className="space-y-4">
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-white"></span>
                Service E-Resultat
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-montserrat font-black leading-tight tracking-tight">
              Bienvenu au service
              <span className="block text-emerald-400 font-montserrat font-black">
                E-Result
              </span>
              <span className="text-2xl md:text-3xl font-bold">
                CENTRE DE DIAGNOSTIC EYANO
              </span>
            </h1>
          </div>

          <div className="space-y-4">
            <p className="text-lg text-white/90 leading-relaxed max-w-xl">
              Plateforme sécurisée et moderne pour la transmission instantanée
              des résultats médicaux via WhatsApp. Simplifiez vos processus,
              améliorez l'expérience patient et garantissez la confidentialité.
            </p>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                <span className="text-sm font-medium">Sécurisé & Conforme</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                <span className="text-sm font-medium">Instantané</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                <span className="text-sm font-medium">Simple</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md flex justify-center lg:justify-end">
          <Card className="w-full shadow-2xl backdrop-blur-sm bg-white/95">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 grid place-items-center">
                  <svg
                    width="28"
                    height="28"
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
              </div>
              <CardTitle className="text-2xl">E-Result</CardTitle>
              <CardDescription>Connectez-vous à votre compte</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="votre.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Mot de passe</label>
                  <Input
                    type="password"
                    placeholder="•••••��••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isLoading}
                >
                  <LogIn size={18} />
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Les sessions expirent après 1 heure d'inactivité
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-white/70 text-sm">
            © 2025 Centre de Diagnostic EYANO
          </p>
        </div>
      </footer>
    </div>
  );
}
