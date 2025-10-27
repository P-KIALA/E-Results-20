import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const images = [
  {
    url: 'https://images.pexels.com/photos/6285370/pexels-photo-6285370.jpeg',
    alt: 'Centre de diagnostic médical',
  },
  {
    url: 'https://images.pexels.com/photos/7734576/pexels-photo-7734576.jpeg',
    alt: 'Envoi et partage sécurisé des résultats',
  },
  {
    url: 'https://images.pexels.com/photos/6011598/pexels-photo-6011598.jpeg',
    alt: 'Technologie médicale et gestion numérique',
  },
];

export default function Index() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-primary/5">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-block">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Service E-Resultat
                  </span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                  Bienvenu au service{' '}
                  <span className="block text-primary">E-Resultat</span>
                  <span className="text-2xl md:text-3xl font-bold text-foreground">
                    du Centre de Diagnostic EYANO
                  </span>
                </h1>
              </div>

              <div className="space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Plateforme sécurisée et moderne pour la transmission instantanée des résultats médicaux via WhatsApp. 
                  Simplifiez vos processus, améliorez l'expérience patient et garantissez la confidentialité.
                </p>

                <div className="flex gap-4 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Sécurisé & Conforme</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Instantané</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Simple</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Carousel */}
            <div className="relative h-[480px] md:h-[650px] rounded-2xl overflow-hidden shadow-2xl">
              {/* Carousel Container */}
              <div className="relative w-full h-full">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      index === currentIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                ))}

                {/* Navigation Buttons */}
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors backdrop-blur-sm"
                  aria-label="Image précédente"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>

                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors backdrop-blur-sm"
                  aria-label="Image suivante"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>

                {/* Dots Indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'bg-white w-8'
                          : 'bg-white/50 w-2 hover:bg-white/75'
                      }`}
                      aria-label={`Aller à l'image ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
