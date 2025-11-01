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
import { Textarea } from "@/components/ui/textarea";
import { Doctor } from "@shared/api";
import { Upload, Send, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/api";

export default function ResultsTab() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
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
  const [savedMessages, setSavedMessages] = useState<{ id: string; title: string; body: string; createdAt: number }[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [newMessageTitle, setNewMessageTitle] = useState("");
  const [newMessageBody, setNewMessageBody] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savedMessages");
      if (raw) setSavedMessages(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("savedMessages", JSON.stringify(savedMessages));
    } catch (e) {}
  }, [savedMessages]);

  const selectedMessage = savedMessages.find((m) => m.id === selectedMessageId) || null;

  const addNewMessage = () => {
    if (!newMessageTitle.trim() || !newMessageBody.trim()) {
      setMessage({ type: "error", text: "Titre et corps du message requis" });
      return;
    }
    const msg = { id: String(Date.now()), title: newMessageTitle.trim(), body: newMessageBody, createdAt: Date.now() };
    setSavedMessages([msg, ...savedMessages]);
    setNewMessageTitle("");
    setNewMessageBody("");
    setShowAddMenu(false);
    setMessage({ type: "success", text: "Message enregistré" });
  };

  const deleteMessage = (id: string) => {
    setSavedMessages(savedMessages.filter((m) => m.id !== id));
    if (selectedMessageId === id) { setSelectedMessageId(null); setPreviewVisible(false); }
  };

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
    // Auto-fill patient site from user's primary site
    if (user?.primary_site?.name) {
      setPatientSite(user.primary_site.name);
    }
  }, [user?.primary_site?.name]);

  const fetchDoctors = async () => {
    try {
      const res = await authFetch("/api/doctors");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDoctors(
        data.doctors?.filter((d: Doctor) => d.whatsapp_verified) || [],
      );
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
      const res = await authFetch("/api/send-results", {
        method: "POST",
        body: JSON.stringify({
          doctor_ids: selectedDoctors,
          custom_message: customMessage,
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
            <label className="text-sm font-medium">Rechercher un médecin (nom, prénom, téléphone)</label>
            <Input
              placeholder="Rechercher par nom ou téléphone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Tapez le nom, prénom ou téléphone pour afficher les médecins correspondants.</p>
          </div>

          {filteredDoctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun médecin correspondant</p>
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
                  <p className="text-xs text-muted-foreground">{doctor.phone}</p>
                </div>
              </label>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message personnalisé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setShowAddMenu((s) => !s);
                  setShowListMenu(false);
                }}
              >
                Ajouter un message
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setShowListMenu((s) => !s);
                  setShowAddMenu(false);
                }}
              >
                Messages enregistrés
              </Button>

              {previewVisible && selectedMessage && (
                <div className="ml-auto flex items-center gap-2 text-sm">
                  <span className="font-medium">Prévisualisation:</span>
                  <span className="text-muted-foreground">{selectedMessage.title}</span>
                </div>
              )}
            </div>

            {/* Add Message Centered Modal */}
            {showAddMenu && (
              <div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-auto">
                <div className="absolute inset-0 bg-black/30" onClick={() => { setShowAddMenu(false); }} />
                <div className="relative z-50 w-11/12 sm:w-96 bg-white border rounded-lg shadow-xl p-4 transform-gpu transition-all duration-150" onClick={(e) => e.stopPropagation()}>
                  <h4 className="text-sm font-semibold mb-2">Ajouter un message</h4>
                  <label className="text-xs font-medium">Titre du message</label>
                  <Input
                    value={newMessageTitle}
                    onChange={(e) => setNewMessageTitle(e.target.value)}
                    className="mt-1 mb-2"
                    placeholder="Titre"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label className="text-xs font-medium">Corps du message</label>
                  <Textarea
                    value={newMessageBody}
                    onChange={(e) => setNewMessageBody(e.target.value)}
                    rows={6}
                    className="mt-1"
                    placeholder="Écrivez le corps du message..."
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setShowAddMenu(false); setNewMessageTitle(''); setNewMessageBody(''); }}>
                      Annuler
                    </Button>
                    <Button size="sm" onClick={addNewMessage}>
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* List Messages Centered Modal */}
            {showListMenu && (
              <div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-auto">
                <div className="absolute inset-0 bg-black/30" onClick={() => { setShowListMenu(false); }} />
                <div className="relative z-50 w-11/12 sm:w-96 bg-white border rounded-lg shadow-xl p-2 max-h-[70vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-2 border-b">
                    <h4 className="text-sm font-semibold">Messages enregistrés</h4>
                    <Button size="xs" variant="ghost" onClick={() => setShowListMenu(false)}>Fermer</Button>
                  </div>
                  {savedMessages.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Aucun message enregistré</p>
                  ) : (
                    savedMessages.map((m) => (
                      <div key={m.id} className="p-2 hover:bg-muted rounded flex items-start gap-2">
                        <div className="flex-1" onClick={() => { setSelectedMessageId(m.id); setPreviewVisible(true); setShowListMenu(false); }}>
                          <button
                            className="text-sm font-medium text-left w-full"
                          >
                            {m.title}
                          </button>
                          <p className="text-xs text-muted-foreground mt-1">{m.body.substring(0, 120)}{m.body.length>120? '...' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="xs" onClick={() => { setCustomMessage(m.body); setShowListMenu(false); setMessage({ type: 'success', text: 'Message inséré' }); }}>
                            Insérer
                          </Button>
                          <Button size="xs" variant="ghost" className="text-red-600" onClick={() => deleteMessage(m.id)}>
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={6}
            placeholder="Écrivez votre message..."
          />

          {previewVisible && selectedMessage && (
            <div className="p-3 border rounded bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{selectedMessage.title}</p>
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground mt-1">{selectedMessage.body}</pre>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button size="sm" onClick={() => setCustomMessage(selectedMessage.body)}>
                    Insérer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedMessageId(null); setPreviewVisible(false); }}>
                    Fermer
                  </Button>
                </div>
              </div>
            </div>
          )}

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
