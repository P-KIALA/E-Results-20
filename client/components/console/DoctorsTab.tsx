import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Doctor } from "@shared/api";
import {
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Pencil,
} from "lucide-react";

// Mock data
const MOCK_DOCTORS: Doctor[] = [
  {
    id: "doc1",
    phone: "+243123456789",
    name: "PARACLET KIALA",
    specialization: "Généraliste",
    cnom: "12345",
    whatsapp_verified: true,
    whatsapp_verified_at: "2025-01-30T10:00:00Z",
    created_at: "2025-01-30T10:00:00Z",
    updated_at: "2025-01-30T10:00:00Z",
  },
  {
    id: "doc2",
    phone: "+243987654321",
    name: "Dr. MARIE KABILA",
    specialization: "Pédiatrie",
    cnom: "67890",
    whatsapp_verified: false,
    created_at: "2025-01-30T11:00:00Z",
    updated_at: "2025-01-30T11:00:00Z",
  },
];

export default function DoctorsTab() {
  const [doctors, setDoctors] = useState<Doctor[]>(MOCK_DOCTORS);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    name: "",
    specialization: "",
    cnom: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    specialization: "",
    cnom: "",
  });
  const [deletingDoctorId, setDeletingDoctorId] = useState<string | null>(null);
  const [deletingDoctorName, setDeletingDoctorName] = useState("");

  useEffect(() => {
    // API calls disabled
    // fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    console.log("API calls disabled - using mock data");
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "error", text: "Fonction désactivée en mode démonstration" });
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setMessage({ type: "error", text: "Fonction désactivée en mode démonstration" });
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "error", text: "Fonction désactivée en mode démonstration" });
  };

  const handleDeleteDoctor = async (id: string) => {
    setMessage({ type: "error", text: "Fonction désactivée en mode démonstration" });
  };

  const confirmDelete = async () => {
    setMessage({ type: "error", text: "Fonction désactivée en mode démonstration" });
  };

  const handleVerifyDoctor = async (id: string) => {
    setMessage({ type: "error", text: "Fonction désactivée en mode démonstration" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Gestion des médecins
          </h2>
          <p className="text-muted-foreground">
            {doctors.length} médecin(s) enregistré(s)
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2" disabled>
          <Plus size={16} /> Ajouter un médecin
        </Button>
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

      {loading ? (
        <p className="text-center text-muted-foreground">Chargement...</p>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun médecin enregistré
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {doctors.map((doctor) => (
            <Card key={doctor.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {doctor.name || doctor.phone}
                      {doctor.whatsapp_verified ? (
                        <CheckCircle
                          size={16}
                          className="text-green-600"
                          title="WhatsApp vérifié"
                        />
                      ) : (
                        <AlertCircle
                          size={16}
                          className="text-yellow-600"
                          title="WhatsApp non vérifié"
                        />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {doctor.phone}
                      {doctor.specialization && ` • ${doctor.specialization}`}
                      {doctor.cnom && ` • CNOM: ${doctor.cnom}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!doctor.whatsapp_verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifyDoctor(doctor.id)}
                        disabled
                        title="Vérifier WhatsApp"
                      >
                        <RefreshCw size={14} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditDoctor(doctor)}
                      disabled
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteDoctor(doctor.id)}
                      disabled
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un médecin</DialogTitle>
            <DialogDescription>
              Remplissez les informations du médecin (désactivé)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDoctor} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Téléphone *</label>
              <Input
                type="tel"
                placeholder="+243..."
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input
                type="text"
                placeholder="Dr. Nom Prénom"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium">Spécialisation</label>
              <Input
                type="text"
                placeholder="Généraliste, Pédiatre..."
                value={formData.specialization}
                onChange={(e) =>
                  setFormData({ ...formData, specialization: e.target.value })
                }
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium">Numéro CNOM</label>
              <Input
                type="text"
                placeholder="12345"
                value={formData.cnom}
                onChange={(e) =>
                  setFormData({ ...formData, cnom: e.target.value })
                }
                disabled
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Ajout..." : "Ajouter"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="text-sm text-muted-foreground text-center p-4 border rounded-lg bg-yellow-50">
        <p>⚠️ Mode démonstration : Les appels API sont désactivés. Utilisez <a href="#" onClick={() => window.open(window.location.origin, '_blank')} className="underline text-blue-600">Open Preview</a> pour accéder à toutes les fonctionnalités.</p>
      </div>
    </div>
  );
}
