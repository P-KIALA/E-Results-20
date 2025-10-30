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

// Mock data
const MOCK_DOCTORS: Doctor[] = [
  {
    id: "doc1",
    phone: "+243123456789",
    name: "PARACLET KIALA",
    whatsapp_verified: true,
    whatsapp_verified_at: "2025-01-30T10:00:00Z",
    created_at: "2025-01-30T10:00:00Z",
    updated_at: "2025-01-30T10:00:00Z",
  },
];

export default function ResultsTab() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>(MOCK_DOCTORS);
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

  useEffect(() => {
    // API calls disabled
    // fetchDoctors();
    if (user?.primary_site?.name) {
      setPatientSite(user.primary_site.name);
    }
  }, [user?.primary_site?.name]);

  const fetchDoctors = async () => {
    console.log("API calls disabled - using mock data");
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
    setMessage({ type: "error", text: "Fonction désactivée en mode démonstration" });
  };

  const handleSendResults = async () => {
    setMessage({ type: "error", text: "Fonction désactivée en mode démonstration" });
  };

  const toggleDoctorSelection = (id: string) => {
    setSelectedDoctors((prev) =>
      prev.includes(id) ? prev.filter((did) => did !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Envoyer des résultats
        </h2>
        <p className="text-muted-foreground">
          Sélectionnez les médecins et uploadez les fichiers
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

      <Card>
        <CardHeader>
          <CardTitle>1. Sélectionner les médecins</CardTitle>
          <CardDescription>
            Choisissez un ou plusieurs médecins (WhatsApp vérifié uniquement)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun médecin avec WhatsApp vérifié
            </p>
          ) : (
            <div className="grid gap-2">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDoctors.includes(doctor.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleDoctorSelection(doctor.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedDoctors.includes(doctor.id)}
                    onChange={() => toggleDoctorSelection(doctor.id)}
                    className="rounded"
                    disabled
                  />
                  <div className="flex-1">
                    <p className="font-medium">{doctor.name || doctor.phone}</p>
                    <p className="text-sm text-muted-foreground">
                      {doctor.phone}
                      {doctor.specialization && ` • ${doctor.specialization}`}
                    </p>
                  </div>
                  {doctor.whatsapp_verified && (
                    <CheckCircle size={16} className="text-green-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Informations du patient</CardTitle>
          <CardDescription>
            Renseignez le nom du patient et son site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nom du patient *</label>
            <Input
              type="text"
              placeholder="Nom Prénom"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              disabled
            />
          </div>
          <div>
            <label className="text-sm font-medium">Site du centre *</label>
            <Input
              type="text"
              placeholder="LIMETE, KINTAMBO..."
              value={patientSite}
              onChange={(e) => setPatientSite(e.target.value)}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Message personnalisé</CardTitle>
          <CardDescription>
            Personnalisez le message envoyé avec les résultats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={5}
            placeholder="Votre message..."
            disabled
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Fichiers de résultats</CardTitle>
          <CardDescription>
            Uploadez les fichiers PDF (max 16 MB par fichier)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept="application/pdf,image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="gap-2" disabled asChild>
                <span>
                  <Upload size={16} /> Sélectionner des fichiers
                </span>
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
              <Button
                onClick={handleUploadFiles}
                disabled={uploading || uploadedFileIds.length > 0}
                className="w-full"
              >
                {uploading ? "Upload..." : "Upload les fichiers"}
              </Button>
            </div>
          )}

          {uploadedFileIds.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              ✓ {uploadedFileIds.length} fichier(s) uploadé(s)
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSendResults}
          disabled={
            sending ||
            selectedDoctors.length === 0 ||
            uploadedFileIds.length === 0 ||
            !patientName ||
            !patientSite
          }
          className="gap-2"
        >
          <Send size={16} />
          {sending ? "Envoi en cours..." : "Envoyer les résultats"}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground text-center p-4 border rounded-lg bg-yellow-50">
        <p>⚠️ Mode démonstration : Les appels API sont désactivés. Utilisez <a href="#" onClick={() => window.open(window.location.origin, '_blank')} className="underline text-blue-600">Open Preview</a> pour accéder à toutes les fonctionnalités.</p>
      </div>
    </div>
  );
}
