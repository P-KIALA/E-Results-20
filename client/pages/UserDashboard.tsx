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

export default function UserDashboard() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState(
    "Bonjour,\n\nVous trouverez ci-joint les résultats d'analyse demandés.\n\nCordialement",
  );
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

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/doctors", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newDoctor.name,
          phone: newDoctor.phone,
          specialization: newDoctor.specialization || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
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
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/doctors/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
      const res = await fetch("/api/upload-files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ files: fileDataList }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const result = await res.json();
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

    if (!customMessage.trim()) {
      setMessage({ type: "error", text: "Écrivez un message" });
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor_ids: selectedDoctors,
          custom_message: customMessage,
          file_ids: uploadedFileIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const result = await res.json();
      const successCount = result.results.filter((r: any) => r.success).length;
      setMessage({
        type: "success",
        text: `${successCount}/${selectedDoctors.length} envoyé(s)`,
      });
      setSelectedDoctors([]);
      setCustomMessage(
        "Bonjour,\n\nVous trouverez ci-joint les résultats d'analyse demandés.\n\nCordialement",
      );
      setUploadedFileIds([]);
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

      {user?.permissions?.includes("manage_doctors") && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle>Ajouter un médecin</CardTitle>
              <CardDescription>
                Créez un nouveau profil médecin
              </CardDescription>
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
            disabled={sending || selectedDoctors.length === 0}
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
