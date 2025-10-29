import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function PatientsTab() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", dob: "", site: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getToken = () => localStorage.getItem("auth_token");

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/patients", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch patients");
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur lors du chargement" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", dob: "", site: "" });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const token = getToken();
      const payload = { ...form };
      const url = editingId ? `/api/patients/${editingId}` : "/api/patients";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.clone().json().catch(() => ({}));
        throw new Error(err.error || "Erreur");
      }
      const data = await res.json();
      setMessage({ type: "success", text: editingId ? "Patient modifié" : "Patient ajouté" });
      setShowForm(false);
      await fetchPatients();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: String(err.message || err) });
    }
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({ name: p.name || "", phone: p.phone || "", dob: p.dob || "", site: p.site || "" });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr ?")) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.clone().json().catch(() => ({}));
        throw new Error(err.error || "Erreur de suppression");
      }
      await fetchPatients();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur de suppression" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Gestion des patients</h2>
        <Button onClick={openCreate} className="gap-2"><span>Nouveau patient</span></Button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-3">
        {loading ? (
          <p>Chargement...</p>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">Aucun patient</CardContent>
          </Card>
        ) : (
          patients.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 flex justify-between items-start">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  {p.phone && <p className="text-sm text-muted-foreground">{p.phone}</p>}
                  {p.site && <p className="text-sm text-muted-foreground">Site: {p.site}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>Modifier</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Supprimer</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier patient" : "Nouveau patient"}</DialogTitle>
            <DialogDescription>{editingId ? "Modifiez le patient" : "Remplissez les informations du patient"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <input className="w-full px-3 py-2 rounded border" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <input className="w-full px-3 py-2 rounded border" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Date de naissance</label>
              <input type="date" className="w-full px-3 py-2 rounded border" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Site</label>
              <input className="w-full px-3 py-2 rounded border" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Modifier" : "Créer"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
