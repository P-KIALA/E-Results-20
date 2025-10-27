export default function Index() {
  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container py-16 md:py-24">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-primary mb-6">
                Bienvenu au service E-Resultat du Centre de Diagnostic EYANO
              </h1>
              <p className="text-lg text-muted-foreground">
                Plateforme sécurisée pour la transmission des résultats médicaux via WhatsApp
              </p>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img 
                src="https://images.pexels.com/photos/6285370/pexels-photo-6285370.jpeg" 
                alt="Centre de diagnostic médical" 
                className="w-full h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
