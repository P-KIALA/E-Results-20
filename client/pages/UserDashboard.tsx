import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Send, Plus, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/api";
import { useSite } from "@/lib/site-context";

export default function UserDashboard() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState(
    "Bonjour,\n\nVous trouverez ci-joint les résultats d'analyse demandés.\n\nCordialement",
  );
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
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [addingDoctor, setAddingDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    phone: "",
    specialization: "",
  });
  // Extra arbitrary recipient numbers (comma/newline separated)
  const [extraRecipients, setExtraRecipients] = useState("");
  const parseExtraRecipients = () =>
    extraRecipients
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const { sites, currentSiteId, canChangeSite } = useSite();

  useEffect(() => {
    fetchDoctors();

    // Auto-fill patient site:
    // 1) If user can change site and a currentSiteId is selected, use that site's name
    // 2) Otherwise, prefer the fully loaded user.primary_site.name
    // 3) If user.primary_site is not populated but primary_site_id exists, find the site from the sites list and use its name
    if (canChangeSite && currentSiteId) {
      const site = sites.find((s: any) => s.id === currentSiteId);
      if (site?.name) {
        setPatientSite(site.name);
      }
    } else if (user?.primary_site?.name) {
      setPatientSite(user.primary_site.name);
    } else if (user?.primary_site_id) {
      const site = sites.find((s: any) => s.id === user.primary_site_id);
      if (site?.name) {
        setPatientSite(site.name);
      }
    }
  }, [user?.primary_site?.name, user?.primary_site_id, sites, currentSiteId, canChangeSite]);

  const fetchDoctors = async () => {
    try {
      const res = await authFetch("/api/doctors");
      const data = await res.json();
      setDoctors(data.doctors?.filter((d: any) => d.whatsapp_verified) || []);
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors du chargement" });
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.phone) {
      setMessage({ type: "error", text: "Nom et téléphone requis" });
      return;
    }

    setAddingDoctor(true);
    try {
      const res = await authFetch("/api/doctors", {
        method: "POST",
        body: JSON.stringify({
          name: newDoctor.name,
          phone: newDoctor.phone,
          specialization: newDoctor.specialization || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      setMessage({ type: "success", text: "Médecin ajouté" });
      setNewDoctor({ name: "", phone: "", specialization: "" });
      setShowAddDoctor(false);
      await fetchDoctors();
    } catch (error) {
      setMessage({ type: "error", text: String(error) });
    } finally {
      setAddingDoctor(false);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm("Êtes-vous sûr ?")) return;

    try {
      const res = await authFetch(`/api/doctors/${id}`, { method: "DELETE" });

      if (!res.ok) throw new Error("Erreur de suppression");

      setMessage({ type: "success", text: "Médecin supprimé" });
      await fetchDoctors();
    } catch (error) {
      setMessage({ type: "error", text: "Erreur" });
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

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const res = await authFetch("/api/upload-files", {
        method: "POST",
        body: JSON.stringify({ files: fileDataList }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de l'upload");
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
    const parsedExtras = parseExtraRecipients();

    if (selectedDoctors.length === 0 && parsedExtras.length === 0) {
      setMessage({
        type: "error",
        text: "Sélectionnez au moins un médecin ou ajoutez un numéro",
      });
      return;
    }

    if (!customMessage.trim()) {
      setMessage({ type: "error", text: "Écrivez un message" });
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
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const res = await authFetch("/api/send-results", {
        method: "POST",
        body: JSON.stringify({
          doctor_ids: selectedDoctors,
          custom_message: customMessage,
          file_ids: uploadedFileIds,
          patient_name: patientName || undefined,
          patient_site: patientSite || undefined,
          extra_numbers: parseExtraRecipients(),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de l'envoi");
      }

      const successCount = result.results.filter((r: any) => r.success).length;
      setMessage({
        type: "success",
        text: `${successCount}/${selectedDoctors.length} envoyé(s)`,
      });
      setSelectedDoctors([]);
      setPatientName("");
      setCustomMessage(
        "Bonjour,\n\nVous trouverez ci-joint les résultats d'analyse demandés.\n\nCordialement",
      );
      setUploadedFileIds([]);
      setExtraRecipients("");
    } catch (error) {
      setMessage({ type: "error", text: `Erreur: ${String(error)}` });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          Envoyer des résultats
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Uploadez les fichiers et envoyez-les aux médecins
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Destinataires supplémentaires</CardTitle>
          <CardDescription>
            Ajoutez des numéros (un par ligne ou séparés par des virgules)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="+243821234567\n+33712345678"
            value={extraRecipients}
            onChange={(e) => setExtraRecipients(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {user?.permissions?.includes("manage_doctors") && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle>Ajouter un médecin</CardTitle>
              <CardDescription>Créez un nouveau profil médecin</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddDoctor(!showAddDoctor)}
              className="gap-2"
            >
              <Plus size={16} /> {showAddDoctor ? "Annuler" : "Ajouter"}
            </Button>
          </CardHeader>

          {showAddDoctor && (
            <CardContent>
              <form onSubmit={handleAddDoctor} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    placeholder="Dr. Dupont"
                    value={newDoctor.name}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Téléphone</label>
                  <Input
                    placeholder="+243821234567"
                    value={newDoctor.phone}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, phone: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Spécialisation</label>
                  <Input
                    placeholder="Cardiologie"
                    value={newDoctor.specialization}
                    onChange={(e) =>
                      setNewDoctor({
                        ...newDoctor,
                        specialization: e.target.value,
                      })
                    }
                  />
                </div>

                <Button
                  type="submit"
                  disabled={addingDoctor}
                  className="w-full"
                >
                  {addingDoctor ? "Ajout en cours..." : "Créer le médecin"}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="grid gap-6 lg:grid-cols-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sélectionner les médecins</CardTitle>
            <CardDescription>Médecins disponibles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {doctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun médecin disponible
              </p>
            ) : (
              doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted group"
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
                  {user?.permissions?.includes("manage_doctors") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDoctor(doctor.id)}
                      className="opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message personnalisé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={6}
            placeholder="Écrivez votre message..."
          />
          <Button
            onClick={handleSend}
            disabled={
              sending ||
              selectedDoctors.length === 0 ||
              !patientName.trim() ||
              !patientSite.trim()
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
