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

export default function DoctorsTab() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
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
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setMessage({
          type: "error",
          text: "Session expirée. Veuillez vous reconnecter.",
        });
        return;
      }
      const res = await fetch("/api/doctors", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch doctors");
      }
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Erreur lors du chargement",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setMessage({
          type: "error",
          text: "Session expirée. Veuillez vous reconnecter.",
        });
        return;
      }

      // Check for duplicates locally
      if (doctors.some(d => d.phone === formData.phone)) {
        setMessage({
          type: "error",
          text: "Ce numéro de téléphone existe déjà",
        });
        setSubmitting(false);
        return;
      }

      if (formData.cnom && doctors.some(d => d.cnom === formData.cnom)) {
        setMessage({
          type: "error",
          text: "Ce numéro CNOM existe déjà",
        });
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage({
          type: "error",
          text: err.error || "Erreur lors de l'ajout",
        });
        return;
      }

      setMessage({ type: "success", text: "Médecin ajouté avec succès" });
      setFormData({ phone: "", name: "", specialization: "", cnom: "" });
      setShowAddForm(false);
      await fetchDoctors();
    } catch (error) {
      console.error("Error adding doctor:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erreur lors de l'ajout",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteDoctor = async () => {
    if (!deletingDoctorId) return;

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setMessage({
          type: "error",
          text: "Session expirée. Veuillez vous reconnecter.",
        });
        return;
      }

      const res = await fetch(`/api/doctors/${deletingDoctorId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Médecin supprimé avec succès" });
        await fetchDoctors();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: err.error || "Erreur de suppression",
        });
      }
    } catch (error) {
      console.error("Error deleting doctor:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erreur de suppression",
      });
    } finally {
      setDeletingDoctorId(null);
      setDeletingDoctorName("");
    }
  };

  const handleDeleteDoctor = (id: string, name: string) => {
    setDeletingDoctorId(id);
    setDeletingDoctorName(name);
  };

  const handleVerify = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setMessage({
          type: "error",
          text: "Session expirée. Veuillez vous reconnecter.",
        });
        return;
      }

      const res = await fetch(`/api/doctors/${id}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Vérification en cours..." });
        await fetchDoctors();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: err.error || "Erreur de vérification",
        });
      }
    } catch (error) {
      console.error("Error verifying doctor:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erreur de vérification",
      });
    }
  };

  const handleEditDoctor = async (id: string) => {
    if (!editFormData.name.trim()) {
      setMessage({
        type: "error",
        text: "Le nom ne peut pas être vide",
      });
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

      // Check for duplicates (excluding current doctor)
      const currentDoctor = doctors.find(d => d.id === id);
      if (editFormData.phone && editFormData.phone !== currentDoctor?.phone &&
          doctors.some(d => d.id !== id && d.phone === editFormData.phone)) {
        setMessage({
          type: "error",
          text: "Ce numéro de téléphone existe déjà",
        });
        return;
      }

      if (editFormData.cnom && editFormData.cnom !== currentDoctor?.cnom &&
          doctors.some(d => d.id !== id && d.cnom === editFormData.cnom)) {
        setMessage({
          type: "error",
          text: "Ce numéro CNOM existe déjà",
        });
        return;
      }

      const res = await fetch(`/api/doctors/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: err.error || "Erreur lors de la modification",
        });
        return;
      }

      setMessage({ type: "success", text: "Médecin modifié avec succès" });
      setEditingDoctorId(null);
      setEditFormData({ name: "", phone: "", specialization: "", cnom: "" });
      await fetchDoctors();
    } catch (error) {
      console.error("Error editing doctor:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erreur lors de la modification",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestion des médecins</h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez et gérez les médecins destinataires
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus size={16} /> Ajouter médecin
        </Button>
      </div>

      {message && !showAddForm && editingDoctorId === null && (
        <div
          className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          {message.text}
        </div>
      )}

      <Dialog open={showAddForm} onOpenChange={(open) => {
        if (!open) {
          setShowAddForm(false);
          setMessage(null);
        } else {
          setShowAddForm(true);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un médecin</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau médecin au système
            </DialogDescription>
          </DialogHeader>
          {message && showAddForm && (
            <div
              className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              {message.text}
            </div>
          )}
          <form onSubmit={handleAddDoctor} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Téléphone *</label>
              <Input
                type="tel"
                placeholder="+243 (format international)"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nom *</label>
              <Input
                placeholder="Dr. Martin Dupont"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Spécialité</label>
              <Input
                placeholder="Cardiologue"
                value={formData.specialization}
                onChange={(e) =>
                  setFormData({ ...formData, specialization: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">CNOM</label>
              <Input
                placeholder="Numéro d'ordre au CNOM"
                value={formData.cnom}
                onChange={(e) =>
                  setFormData({ ...formData, cnom: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editingDoctorId !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingDoctorId(null);
          setEditFormData({ name: "", phone: "", specialization: "", cnom: "" });
          setMessage(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le médecin</DialogTitle>
            <DialogDescription>
              Modifiez les informations du médecin
            </DialogDescription>
          </DialogHeader>
          {message && editingDoctorId !== null && (
            <div
              className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              {message.text}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom *</label>
              <Input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Nom du médecin"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input
                type="tel"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="+243 (format international)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Spécialité</label>
              <Input
                type="text"
                value={editFormData.specialization}
                onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                placeholder="Cardiologue"
              />
            </div>
            <div>
              <label className="text-sm font-medium">CNOM</label>
              <Input
                type="text"
                value={editFormData.cnom}
                onChange={(e) => setEditFormData({ ...editFormData, cnom: e.target.value })}
                placeholder="Numéro d'ordre au CNOM"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingDoctorId(null);
                  setEditFormData({ name: "", phone: "", specialization: "", cnom: "" });
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={() => editingDoctorId && handleEditDoctor(editingDoctorId)}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-center text-muted-foreground">Chargement...</p>
        ) : doctors.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Aucun médecin. Commencez par en ajouter un.
            </CardContent>
          </Card>
        ) : (
          doctors.map((doctor) => (
            <Card key={doctor.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{doctor.name}</h4>
                      {doctor.whatsapp_verified ? (
                        <CheckCircle
                          size={16}
                          className="text-green-600"
                          title="Vérifié WhatsApp"
                        />
                      ) : (
                        <AlertCircle
                          size={16}
                          className="text-amber-600"
                          title="Non vérifié WhatsApp"
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doctor.phone}
                    </p>
                    {doctor.specialization && (
                      <p className="text-sm text-muted-foreground">
                        Spécialité: {doctor.specialization}
                      </p>
                    )}
                    {doctor.cnom && (
                      <p className="text-sm text-muted-foreground">
                        CNOM: {doctor.cnom}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingDoctorId(doctor.id);
                        setEditFormData({
                          name: doctor.name,
                          phone: doctor.phone,
                          specialization: doctor.specialization || "",
                          cnom: doctor.cnom || "",
                        });
                      }}
                      className="gap-2"
                    >
                      <Pencil size={14} /> Modifier
                    </Button>
                    {!doctor.whatsapp_verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(doctor.id)}
                        className="gap-2"
                      >
                        <RefreshCw size={14} /> Vérifier
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteDoctor(doctor.id)}
                      className="gap-2"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
