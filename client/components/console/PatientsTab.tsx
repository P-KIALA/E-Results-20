import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function PatientsTab() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", dob: "", site: "", sex: "", doctor: "", patient_ref: "" });
  const [analyses, setAnalyses] = useState<{ name: string; status?: string | null }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);

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
    setForm({ name: "", phone: "", dob: "", site: "", sex: "", doctor: "", patient_ref: "" });
    setAnalyses([]);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const token = getToken();
      const payload: any = { ...form, analyses };
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
    setForm({ name: p.name || "", phone: p.phone || "", dob: p.dob || "", site: p.site || "", sex: p.sex || "", doctor: p.doctor || "", patient_ref: p.patient_ref || "" });
    setAnalyses((p.analyses || []).map((a: any) => ({ name: a.name, status: a.status || null })));
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

  // QR scanning using BarcodeDetector if available
  const startScanner = async () => {
    setShowScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      await (videoRef.current as HTMLVideoElement).play();

      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (!BarcodeDetectorClass) return;
      const bd = new BarcodeDetectorClass({ formats: ["qr_code"] });
      detectorRef.current = bd;

      const scanLoop = async () => {
        if (!videoRef.current || !detectorRef.current || !showScanner) return;
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              await handleQRPayload(raw);
              stopScanner();
              return;
            }
          }
        } catch (e) {
          // ignore detection errors
        }
        requestAnimationFrame(scanLoop);
      };
      requestAnimationFrame(scanLoop);
    } catch (error) {
      console.error("Scanner error", error);
      setMessage({ type: "error", text: "Impossible d'accéder à la caméra" });
    }
  };

  const stopScanner = () => {
    setShowScanner(false);
    try {
      const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks() || [];
      tracks.forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch (e) {
      // ignore
    }
  };

  const handleQRPayload = async (raw: string) => {
    try {
      const token = getToken();
      const res = await fetch("/api/patients/scan", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ qr: raw }) });
      if (!res.ok) throw new Error("Erreur lors du parsing du QR");
      const data = await res.json();
      const parsed = data.parsed || {};
      setForm({ name: parsed.name || "", phone: parsed.phone || "", dob: parsed.dob || "", site: "", sex: parsed.sex || "", doctor: parsed.doctor || "", patient_ref: parsed.patient_ref || "" });
      setAnalyses((parsed.analyses || []).map((a: any) => ({ name: a.name, status: a.status || "pending" })));
      setShowForm(true);
      setMessage(null);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible d'analyser le QR" });
    }
  };

  const addAnalysis = () => {
    setAnalyses([...analyses, { name: "", status: "pending" }]);
  };
  const updateAnalysisName = (i: number, name: string) => {
    const copy = [...analyses];
    copy[i] = { ...copy[i], name };
    setAnalyses(copy);
  };
  const removeAnalysis = (i: number) => {
    const copy = [...analyses];
    copy.splice(i, 1);
    setAnalyses(copy);
  };

  const validateAnalysis = async (patientId: string, index: number) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/patients/${patientId}/analyses/${index}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: "validated" }) });
      if (!res.ok) throw new Error("Erreur lors de la validation");
      await fetchPatients();
      setMessage({ type: "success", text: "Analyse validée" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur lors de la validation" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Gestion des patients</h2>
        <div className="flex gap-2">
          <Button onClick={() => { setShowScanner(true); startScanner(); }} className="gap-2">Scanner QR</Button>
          <Button onClick={openCreate} className="gap-2"><span>Nouveau patient</span></Button>
        </div>
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
                  <p className="font-semibold">{p.name} {p.patient_ref ? `(${p.patient_ref})` : ""}</p>
                  {p.phone && <p className="text-sm text-muted-foreground">{p.phone}</p>}
                  {p.site && <p className="text-sm text-muted-foreground">Site: {p.site}</p>}
                  {p.doctor && <p className="text-sm text-muted-foreground">Medecin: {p.doctor}</p>}
                  {p.analyses && p.analyses.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Analyses:</p>
                      <ul className="text-sm list-disc ml-5">
                        {p.analyses.map((a: any, idx: number) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span>{a.name}</span>
                            <span className="text-xs text-muted-foreground">{a.status || 'pending'}</span>
                            <Button size="sm" variant="outline" onClick={() => validateAnalysis(p.id, idx)}>Valider</Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier patient" : "Nouveau patient"}</DialogTitle>
            <DialogDescription>{editingId ? "Modifiez le patient" : "Remplissez les informations du patient"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom complet</label>
              <input className="w-full px-3 py-2 rounded border" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Téléphone</label>
                <input className="w-full px-3 py-2 rounded border" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">ID patient</label>
                <input className="w-full px-3 py-2 rounded border" value={form.patient_ref} onChange={(e) => setForm({ ...form, patient_ref: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium">Date de naissance</label>
                <input type="date" className="w-full px-3 py-2 rounded border" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Sexe</label>
                <select className="w-full px-3 py-2 rounded border" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                  <option value="">--</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="Other">Autre</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Medecin</label>
                <input className="w-full px-3 py-2 rounded border" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Analyses à effectuer</label>
              <div className="space-y-2">
                {analyses.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="px-3 py-2 rounded border flex-1" value={a.name} onChange={(e) => updateAnalysisName(i, e.target.value)} placeholder="Nom de l'analyse" />
                    <Button type="button" variant="destructive" onClick={() => removeAnalysis(i)}>Suppr</Button>
                  </div>
                ))}
                <div>
                  <Button type="button" onClick={addAnalysis}>Ajouter analyse</Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Modifier" : "Créer"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showScanner} onOpenChange={(open) => { if (!open) stopScanner(); setShowScanner(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scanner QR</DialogTitle>
            <DialogDescription>Utilisez la camera pour scanner un QR contenant les infos patient (JSON ou clé:valeur)</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <video ref={videoRef} className="w-full rounded bg-black" style={{ height: 320 }} />
            <div className="flex gap-2">
              <Button onClick={startScanner}>Démarrer</Button>
              <Button variant="outline" onClick={() => { stopScanner(); setShowScanner(false); }}>Fermer</Button>
            </div>
            <div>
              <label className="text-sm font-medium">Ou coller le contenu du QR (JSON ou clé:valeur)</label>
              <textarea placeholder='{"name":"Jean", "phone":"+241...", "analyses":"NFS;Glycémie"}' className="w-full px-3 py-2 rounded border" onBlur={async (e) => { if (e.target.value.trim()) await handleQRPayload(e.target.value.trim()); }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
