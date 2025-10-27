import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container py-10 grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 grid place-items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3v6l4 2" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold">WhatsDeliver</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">Logiciel d'envoi des résultats en ligne via WhatsApp, fiable et simple.</p>
        </div>
        <div className="text-sm text-muted-foreground flex flex-col gap-2">
          <Link to="/" className="hover:text-foreground">Accueil</Link>
          <Link to="/console" className="hover:text-foreground">Console</Link>
        </div>
        <div className="text-sm text-muted-foreground md:text-right">
          <p>
            © {new Date().getFullYear()} Le PARACLET. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
