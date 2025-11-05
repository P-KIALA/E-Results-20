import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Doctor } from "@shared/api";
import { Upload, Send, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/api";
import { useSite } from "@/lib/site-context";

export default function ResultsTab() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientSite, setPatientSite] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { sites, currentSiteId, canChangeSite } = useSite();
  const [siteFilter, setSiteFilter] = useState<string>(() =>
    canChangeSite ? "all" : localStorage.getItem("current_site_id") || "",
  );

  const filteredDoctors = doctors.filter((d) => {
    if (!searchQuery || searchQuery.trim().length === 0) return false; // hide all until user searches
    const q = searchQuery.toLowerCase().trim();
    // match on name or phone; also split tokens
    const name = (d.name || "").toLowerCase();
    const phone = (d.phone || "").toLowerCase();
    if (name.includes(q) || phone.includes(q)) return true;
    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((t) => name.includes(t) || phone.includes(t));
  });

  useEffect(() => {
    fetchDoctors();
    // Auto-fill patient site: prefer selected site when user can change site, otherwise use user's primary site
    if (canChangeSite && currentSiteId) {
      const site = sites.find((s: any) => s.id === currentSiteId);
      if (site?.name) {
        setPatientSite(site.name);
      }
    } else if (user?.primary_site?.name) {
      setPatientSite(user.primary_site.name);
    }
  }, [
    user?.primary_site?.name,
    siteFilter,
    currentSiteId,
    canChangeSite,
    sites,
  ]);

  const fetchDoctors = async () => {
    try {
      let url = "/api/doctors";
      // If a specific site is selected, try to pass it to the API
      if (siteFilter && siteFilter !== "all") {
        url += `?site_id=${encodeURIComponent(siteFilter)}`;
      } else if (!canChangeSite && currentSiteId) {
        url += `?site_id=${encodeURIComponent(currentSiteId)}`;
      }

      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      // If API doesn't return site-scoped doctors, we still filter client-side when possible
      const loaded: Doctor[] = data.doctors || [];
      const filtered = loaded.filter((d: any) => d.whatsapp_verified);
      // client-side site filtering if doctor has site_id
      const final = filtered.filter((d: any) => {
        if (siteFilter && siteFilter !== "all") {
          if (d.site_id) return d.site_id === siteFilter;
        }
        if (!canChangeSite && currentSiteId) {
          if (d.site_id) return d.site_id === currentSiteId;
        }
        return true;
      });
      setDoctors(final);
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors du chargement" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const validFiles = selected.filter((f) => {
      if (f.size > 16 * 1024 * 1024) {
        setMessage({ type: "error", text: `${f.name} dépasse 16 MB` });
        return false;
      }
      return true;
    });
    setFiles([...files, ...validFiles]);
  };

  const handleUploadFiles = async () => {
    if (files.length === 0) {
      setMessage({ type: "error", text: "Sélectionnez au moins un fichier" });
      return;
    }

    setUploading(true);
    try {
      const fileDataList = await Promise.all(
        files.map(async (file) => {
          const data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(",")[1];
              resolve(base64);
            };
            reader.readAsDataURL(file);
          });

          return {
            name: file.name,
            data,
            type: file.type,
          };
        }),
      );

      const res = await authFetch("/api/upload-files", {
        method: "POST",
        body: JSON.stringify({ files: fileDataList }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadedFileIds(result.files.map((f: any) => f.id));
      setMessage({
        type: "success",
        text: `${result.files.length} fichier(s) uploadé(s)`,
      });
      setFiles([]);
    } catch (error) {
      setMessage({ type: "error", text: `Erreur: ${String(error)}` });
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (selectedDoctors.length === 0) {
      setMessage({ type: "error", text: "Sélectionnez au moins un médecin" });
      return;
    }

    if (!patientName.trim()) {
      setMessage({ type: "error", text: "Le nom du malade est requis" });
      return;
    }

    if (!patientSite.trim()) {
      setMessage({ type: "error", text: "Le site du centre est requis" });
      return;
    }

    setSending(true);
    try {
      const res = await authFetch("/api/send-results", {
        method: "POST",
        body: JSON.stringify({
          doctor_ids: selectedDoctors,
          file_ids: uploadedFileIds,
          patient_name: patientName || undefined,
          patient_site: patientSite || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Send failed");
      }

      const successCount = result.results.filter((r: any) => r.success).length;
      setMessage({
        type: "success",
        text: `${successCount}/${selectedDoctors.length} envoyé(s)`,
      });
      setSelectedDoctors([]);
      setUploadedFileIds([]);
    } catch (error) {
      setMessage({ type: "error", text: `Erreur: ${String(error)}` });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Envoyer des résultats</h3>
        <p className="text-sm text-muted-foreground">
          Uploadez les fichiers et envoyez-les aux médecins
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={18} /> Upload des fichiers
          </CardTitle>
          <CardDescription>PDF, JPG, PNG (max 16 MB chacun)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <p className="font-medium">Cliquez pour sélectionner</p>
              <p className="text-sm text-muted-foreground">
                ou glissez des fichiers ici
              </p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 bg-muted rounded"
                >
                  <span className="text-sm">{f.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setFiles(files.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleUploadFiles}
            disabled={uploading || files.length === 0}
            className="w-full"
          >
            {uploading
              ? "Upload en cours..."
              : `Upload ${files.length} fichier(s)`}
          </Button>

          {uploadedFileIds.length > 0 && (
            <div className="p-3 bg-green-50 rounded flex items-center gap-2 text-green-800">
              <CheckCircle size={16} />
              {uploadedFileIds.length} fichier(s) prêt(s)
            </div>
          )}

          {/* Patient name and site - always visible and required */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">Nom du malade</label>
              <Input
                placeholder="Nom du malade"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                aria-required={true}
              />
              {!patientName.trim() && (
                <p className="text-xs text-red-600 mt-1">
                  Le nom du malade est requis.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">
                Site du centre {user?.primary_site?.name && "(auto-complété)"}
              </label>
              <Input
                placeholder="Site du centre"
                value={patientSite}
                onChange={(e) => setPatientSite(e.target.value)}
                aria-required={true}
              />
              {!patientSite.trim() && (
                <p className="text-xs text-red-600 mt-1">
                  Le site du centre est requis.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sélectionner les médecins destinataires</CardTitle>
          <CardDescription>
            Seuls les médecins avec WhatsApp vérifié sont listés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Rechercher un médecin (nom, prénom, téléphone)
              </label>
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
                disabled={!canChangeSite}
              >
                {canChangeSite ? (
                  <option value="all">Tout le site</option>
                ) : null}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              placeholder="Rechercher par nom ou téléphone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tapez le nom, prénom ou téléphone pour afficher les médecins
              correspondants.
            </p>
          </div>

          {filteredDoctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun médecin correspondant
            </p>
          ) : (
            filteredDoctors.map((doctor) => (
              <label
                key={doctor.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDoctors.includes(doctor.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDoctors([...selectedDoctors, doctor.id]);
                    } else {
                      setSelectedDoctors(
                        selectedDoctors.filter((id) => id !== doctor.id),
                      );
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{doctor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doctor.phone}
                  </p>
                </div>
              </label>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSend}
            disabled={
              sending || selectedDoctors.length === 0 || !patientName.trim()
            }
            className="w-full gap-2"
          >
            <Send size={16} />
            {sending ? "Envoi en cours..." : "Envoyer"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
