import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Trash2, Plus, X, Check } from "lucide-react";
import type { Site } from "@shared/api";

export default function SitesManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("No auth token found");
        return;
      }

      const res = await fetch("/api/sites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch sites");
      }

      const data = await res.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error("Error fetching sites:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Erreur lors du chargement des sites",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newSiteName.trim()) {
      setMessage({ type: "error", text: "Nom du site requis" });
      return;
    }

    // Check if site name already exists
    const siteNameExists = sites.some(
      (site) => site.name.toLowerCase() === newSiteName.trim().toLowerCase(),
    );

    if (siteNameExists) {
      setMessage({ type: "error", text: "Nom du site déjà utilisé" });
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setMessage({
          type: "error",
          text: "Session expirée. Veuillez vous reconnecter.",
        });
        return;
      }

      const res = await fetch("/api/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSiteName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      setMessage({ type: "success", text: "Site créé avec succès" });
      setNewSiteName("");
      setShowForm(false);
      await fetchSites();
    } catch (error) {
      console.error("Error creating site:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Erreur lors de la création",
      });
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (
      !confirm(
        "Êtes-vous sûr ? Cette action supprimera le site de tous les utilisateurs.",
      )
    )
      return;

    setDeletingId(id);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setMessage({
          type: "error",
          text: "Session expirée. Veuillez vous reconnecter.",
        });
        return;
      }

      const res = await fetch(`/api/sites/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur de suppression");
      }

      setMessage({ type: "success", text: "Site supprimé avec succès" });
      await fetchSites();
    } catch (error) {
      console.error("Error deleting site:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erreur de suppression",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Gestion des sites</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Créez, gérez et supprimez les centres de diagnostic
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create Site Form */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus size={20} />
              Ajouter un nouveau site
            </CardTitle>
            <CardDescription>
              Créez un centre de diagnostic pour votre réseau
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
          </Button>
        </CardHeader>

        {showForm && (
          <CardContent>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nom du site</label>
                <Input
                  placeholder="Ex: Centre NGIRI-NGIRI"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Le nom doit être unique et facilement identifiable
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Créer le site
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setNewSiteName("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Sites Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin size={24} className="text-primary" />
          <span className="text-xl font-semibold">
            {sites.length} site(s) configuré(s)
          </span>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Chargement des sites...
            </CardContent>
          </Card>
        ) : sites.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="text-muted-foreground">
                <MapPin size={40} className="mx-auto mb-2 opacity-50" />
                <p>Aucun site configuré</p>
                <p className="text-sm">
                  Commencez par créer votre premier site
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <Card key={site.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row justify-between items-start pb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1">
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{site.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(site.created_at).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSite(site.id)}
                    disabled={deletingId === site.id}
                    className="w-full gap-2"
                  >
                    <Trash2 size={14} />
                    {deletingId === site.id ? "Suppression..." : "Supprimer"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sites Summary Stats */}
      {sites.length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Résumé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sites actifs</p>
                <p className="text-2xl font-bold">{sites.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Créés</p>
                <p className="text-2xl font-bold">
                  {sites.length > 0 ? sites[0].name.length : 0}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Dernier site créé:{" "}
                {sites[0]
                  ? new Date(sites[0].created_at).toLocaleString("fr-FR")
                  : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
