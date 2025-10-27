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
    url: "https://images.pexels.com/photos/6285370/pexels-photo-6285370.jpeg?v=1",
    alt: "Centre de diagnostic médical",
  },
  {
    url: "https://images.pexels.com/photos/7734576/pexels-photo-7734576.jpeg?v=1",
    alt: "Envoi et partage sécurisé des résultats",
  },
  {
    url: "https://images.pexels.com/photos/6011598/pexels-photo-6011598.jpeg?v=1",
    alt: "Technologie médicale et gestion numérique",
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
    <div className="min-h-screen relative overflow-hidden">
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
      <div className="container mx-auto px-4 py-12 h-screen flex items-center justify-between relative z-10">
        {/* Left Side - Hero Content */}
        <div className="w-full lg:w-1/2 space-y-8 text-white">
          <div className="space-y-4">
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-white"></span>
                Service E-Resultat
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-montserrat font-black leading-tight tracking-tight">
              Bienvenu au service{" "}
              <span className="block text-emerald-400">E-Resultat</span>
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
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          <Card className="w-full max-w-md shadow-2xl backdrop-blur-sm bg-white/95">
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
    </div>
  );
}
