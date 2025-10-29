import { useEffect, useState, useRef, FormEvent, ChangeEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function PatientsTab() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    dob: "",
    site: "",
    sex: "",
    doctor: "",
    patient_ref: "",
  });
  const [analyses, setAnalyses] = useState<
    { name: string; status?: string | null }[]
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);

  const getToken = () => localStorage.getItem("auth_token");

  // Helper to safely read a Response body once and parse JSON if possible
  const readResponse = async (res: Response) => {
    try {
      if ((res as any).bodyUsed) {
        return {
          ok: res.ok,
          status: res.status,
          json: null,
          text: null,
          error: "body already used",
        };
      }
      const text = await res.text();
      try {
        const json = text ? JSON.parse(text) : null;
        return { ok: res.ok, status: res.status, json, text };
      } catch (e) {
        return { ok: res.ok, status: res.status, json: null, text };
      }
    } catch (e) {
      return {
        ok: res.ok,
        status: res.status,
        json: null,
        text: null,
        error: String(e),
      };
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await readResponse(res);
      if (!parsed.ok)
        throw new Error(
          parsed.json?.error || parsed.text || "Failed to fetch patients",
        );
      setPatients(parsed.json?.patients || []);
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
    setForm({
      name: "",
      phone: "",
      dob: "",
      site: "",
      sex: "",
      doctor: "",
      patient_ref: "",
    });
    setAnalyses([]);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const token = getToken();
      const payload: any = { ...form, analyses };
      const url = editingId ? `/api/patients/${editingId}` : "/api/patients";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const parsed = await readResponse(res);
      if (!parsed.ok)
        throw new Error(parsed.json?.error || parsed.text || "Erreur");
      setMessage({
        type: "success",
        text: editingId ? "Patient modifié" : "Patient ajouté",
      });
      setShowForm(false);
      await fetchPatients();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: String(err.message || err) });
    }
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      phone: p.phone || "",
      dob: p.dob || "",
      site: p.site || "",
      sex: p.sex || "",
      doctor: p.doctor || "",
      patient_ref: p.patient_ref || "",
    });
    setAnalyses(
      (p.analyses || []).map((a: any) => ({
        name: a.name,
        status: a.status || null,
      })),
    );
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr ?")) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/patients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await readResponse(res);
      if (!parsed.ok)
        throw new Error(
          parsed.json?.error || parsed.text || "Erreur de suppression",
        );
      await fetchPatients();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur de suppression" });
    }
  };

  const addToQueue = async (patientId: string) => {
    try {
      setMessage(null);
      const token = getToken();
      if (!token) {
        setMessage({ type: "error", text: "Vous n'êtes pas connecté" });
        return;
      }
      const res = await fetch(`/api/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_id: patientId }),
      });
      const parsed = await readResponse(res);
      if (!parsed.ok) {
        console.error('addToQueue server response', parsed);
        // handle common statuses
        if (parsed.status === 401) {
          setMessage({ type: 'error', text: "Authentification requise. Connectez-vous." });
          return;
        }
        const srvErr = parsed.json?.error;
        const msg = typeof srvErr === 'string' ? srvErr : (srvErr && (srvErr.message || JSON.stringify(srvErr))) || parsed.text || 'Erreur ajout file';
        setMessage({ type: 'error', text: msg });
        return;
      }
      setMessage({ type: "success", text: "Patient ajouté à la file" });
    } catch (err: any) {
      console.error('addToQueue error', err, err?.stack);
      setMessage({ type: "error", text: String(err.message || err) || "Impossible d'ajouter à la file" });
    }
  };

  // QR scanning using BarcodeDetector if available
  const startScanner = async () => {
    setMessage(null);
    // Ensure BarcodeDetector is available before requesting camera
    const BarcodeDetectorClass = (window as any).BarcodeDetector;

    // Stop any existing stream
    try {
      if (
        videoRef.current &&
        (videoRef.current.srcObject as MediaStream | null)
      ) {
        const prevTracks =
          (videoRef.current.srcObject as MediaStream).getTracks() || [];
        prevTracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      // ignore
    }

    // If BarcodeDetector not available, try dynamic import of qr-scanner as a fallback
    if (!BarcodeDetectorClass) {
      try {
        setMessage({
          type: "info",
          text: "Utilisation du scanner de secours...",
        });
        // Ensure the video element is rendered
        setShowScanner(true);
        // Wait for the DOM to update and ref to be attached (poll briefly)
        await new Promise((resolve) => requestAnimationFrame(resolve));
        let attempts = 0;
        while (!videoRef.current && attempts < 10) {
          await new Promise((r) => setTimeout(r, 50));
          attempts++;
        }

        // If still no video element, check if device has camera inputs
        if (!videoRef.current) {
          const devices =
            navigator.mediaDevices && navigator.mediaDevices.enumerateDevices
              ? await navigator.mediaDevices.enumerateDevices().catch(() => [])
              : [];
          const hasCamera = devices.some((d: any) => d.kind === "videoinput");
          if (!hasCamera) {
            setMessage({
              type: "error",
              text: "Pas de caméra trouvée sur cet appareil. Collez le contenu du QR.",
            });
            try { fileInputRef.current?.click(); } catch (e) {}
            return;
          }
          setMessage({
            type: "error",
            text: "Impossible d'initialiser l'élément vidéo. Collez le contenu du QR.",
          });
          try { fileInputRef.current?.click(); } catch (e) {}
          return;
        }

        const mod = await import("qr-scanner");
        const QrScanner = (mod && (mod as any).default) || mod;
        try {
          (QrScanner as any).WORKER_PATH = new URL(
            "qr-scanner/qr-scanner-worker.min.js",
            import.meta.url,
          ).toString();
        } catch (_) {
          try {
            (QrScanner as any).WORKER_PATH =
              "/node_modules/qr-scanner/qr-scanner-worker.min.js";
          } catch (_) {}
        }

        // Check camera availability in library
        const hasCam = await ((QrScanner as any).hasCamera
          ? (QrScanner as any).hasCamera()
          : Promise.resolve(true));
        if (!hasCam) {
          setMessage({
            type: "error",
            text: "Pas de caméra trouvée sur cet appareil. Collez le contenu du QR.",
          });
          try { fileInputRef.current?.click(); } catch (e) {}
          return;
        }

        const scanner = new (QrScanner as any)(
          videoRef.current,
          async (result: string) => {
            await handleQRPayload(result);
          },
        );
        detectorRef.current = scanner;
        try {
          await (scanner as any).start();
        } catch (startErr) {
          console.warn("qr-scanner failed to start", startErr);
          setMessage({
            type: "error",
            text: "Impossible de démarrer le scanner. Collez le contenu du QR.",
          });
          detectorRef.current = null;
        }
        return;
      } catch (err: any) {
        console.error("Fallback scanner failed", err);
        const msg = String(err && (err.message || err));
        if (msg.includes("Camera not found")) {
          setMessage({
            type: "error",
            text: "Pas de caméra trouvée sur cet appareil.",
          });
        } else if (msg.includes("élément vidéo")) {
          setMessage({
            type: "error",
            text: "Impossible d'initialiser l'élément vidéo. Réessayez.",
          });
        } else {
          setMessage({
            type: "error",
            text: "Scanner non supporté par ce navigateur. Collez le contenu du QR dans la zone prévue.",
          });
        }
        return;
      }
    }

    setShowScanner(true);
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!videoRef.current) throw new Error("Pas d'élément vidéo disponible");

      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      // allow inline playback on mobile browsers
      (videoRef.current as any).playsInline = true;
      await videoRef.current.play();

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
          // If detector fails, log and stop scanner to avoid infinite loop
          console.error("Barcode detection error", e);
        }
        if (showScanner) requestAnimationFrame(scanLoop);
      };
      requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.error("Scanner error Could not start video source", err);
      // Map common errors to user-friendly messages
      let text = "Impossible d'accéder à la caméra";
      if (err && err.name === "NotAllowedError")
        text =
          "Permission refusée pour la caméra. Autorisez l'accès et réessayez.";
      if (err && err.name === "NotFoundError")
        text = "Pas de caméra trouvée sur cet appareil.";
      if (err && err.name === "NotReadableError")
        text = "La caméra est occupée par une autre application.";
      if (err && err.name === "OverconstrainedError")
        text = "Aucun périphérique vidéo ne répond aux contraintes demandées.";
      setMessage({ type: "error", text });
      setShowScanner(false);
      try {
        // Ensure tracks stopped
        const tracks =
          (videoRef.current?.srcObject as MediaStream | null)?.getTracks() ||
          [];
        tracks.forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      } catch (e) {
        // ignore
      }
    }
  };

  const stopScanner = () => {
    setShowScanner(false);
    try {
      const tracks =
        (videoRef.current?.srcObject as MediaStream | null)?.getTracks() || [];
      tracks.forEach((t) => t.stop());
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (e) {}
        videoRef.current.srcObject = null;
      }
      if (
        detectorRef.current &&
        typeof detectorRef.current.stop === "function"
      ) {
        try {
          detectorRef.current.stop();
        } catch (e) {}
      }
      detectorRef.current = null;
    } catch (e) {
      // ignore
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const mod = await import("qr-scanner");
      const QrScanner = (mod && (mod as any).default) || mod;
      // attempt to scan the image file directly
      const result = await (QrScanner as any).scanImage(file, {
        returnDetailedScanResult: false,
      });
      if (result) await handleQRPayload(result as string);
    } catch (err) {
      console.error("Image scan failed", err);
      setMessage({
        type: "error",
        text: "Impossible de lire l'image QR. Collez le contenu du QR.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleQRPayload = async (raw: string) => {
    try {
      const token = getToken();
      const res = await fetch("/api/patients/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qr: raw }),
      });
      const parsed = await readResponse(res);
      if (!parsed.ok)
        throw new Error(
          parsed.json?.error || parsed.text || "Erreur lors du parsing du QR",
        );
      const data = parsed.json || {};
      const p = data.parsed || {};
      setForm({
        name: p.name || "",
        phone: p.phone || "",
        dob: p.dob || "",
        site: "",
        sex: p.sex || "",
        doctor: p.doctor || "",
        patient_ref: p.patient_ref || "",
      });
      setAnalyses(
        (p.analyses || []).map((a: any) => ({
          name: a.name,
          status: a.status || "pending",
        })),
      );
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
      const res = await fetch(`/api/patients/${patientId}/analyses/${index}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "validated" }),
      });
      const parsed = await readResponse(res);
      if (!parsed.ok)
        throw new Error(
          parsed.json?.error || parsed.text || "Erreur lors de la validation",
        );
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
          <Button onClick={openCreate} className="gap-2">
            <span>Nouveau patient</span>
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-3">
        {loading ? (
          <p>Chargement...</p>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Aucun patient
            </CardContent>
          </Card>
        ) : (
          patients.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    {p.name} {p.patient_ref ? `(${p.patient_ref})` : ""}
                  </p>
                  {p.phone && (
                    <p className="text-sm text-muted-foreground">{p.phone}</p>
                  )}
                  {p.site && (
                    <p className="text-sm text-muted-foreground">
                      Site: {p.site}
                    </p>
                  )}
                  {p.doctor && (
                    <p className="text-sm text-muted-foreground">
                      Medecin: {p.doctor}
                    </p>
                  )}
                  {p.analyses && p.analyses.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Analyses:</p>
                      <ul className="text-sm list-disc ml-5">
                        {p.analyses.map((a: any, idx: number) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span>{a.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {a.status || "pending"}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => validateAnalysis(p.id, idx)}
                            >
                              Valider
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(p)}
                  >
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => await addToQueue(p.id)}
                  >
                    Ajouter à la file
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(p.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier patient" : "Nouveau patient"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifiez le patient"
                : "Remplissez les informations du patient"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom complet</label>
              <input
                className="w-full px-3 py-2 rounded border"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Téléphone</label>
                <input
                  className="w-full px-3 py-2 rounded border"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">ID patient</label>
                <input
                  className="w-full px-3 py-2 rounded border"
                  value={form.patient_ref}
                  onChange={(e) =>
                    setForm({ ...form, patient_ref: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium">Date de naissance</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded border"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sexe</label>
                <select
                  className="w-full px-3 py-2 rounded border"
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
                >
                  <option value="">--</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="Other">Autre</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Medecin</label>
                <input
                  className="w-full px-3 py-2 rounded border"
                  value={form.doctor}
                  onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Analyses à effectuer
                </label>
                <Button
                  type="button"
                  onClick={() => {
                    if (!showScanner) startScanner();
                    else stopScanner();
                  }}
                >
                  {showScanner ? "Arrêter le scan" : "Scanner QR"}
                </Button>
              </div>

              {showScanner && (
                <div className="mt-2">
                  <video
                    ref={videoRef}
                    className="w-full rounded bg-black"
                    style={{ height: 240 }}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        startScanner();
                      }}
                    >
                      Démarrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        stopScanner();
                      }}
                    >
                      Arrêter
                    </Button>
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Importer photo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                  <label className="text-sm font-medium mt-2">
                    Ou coller le contenu du QR (JSON ou clé:valeur)
                  </label>
                  <textarea
                    placeholder='{"name":"Jean", "phone":"+241...", "analyses":"NFS;Glycémie"}'
                    className="w-full px-3 py-2 rounded border"
                    onBlur={async (e) => {
                      if (e.target.value.trim())
                        await handleQRPayload(e.target.value.trim());
                    }}
                  />
                </div>
              )}

              <div className="space-y-2 mt-3">
                {analyses.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="px-3 py-2 rounded border flex-1"
                      value={a.name}
                      onChange={(e) => updateAnalysisName(i, e.target.value)}
                      placeholder="Nom de l'analyse"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeAnalysis(i)}
                    >
                      Suppr
                    </Button>
                  </div>
                ))}
                <div>
                  <Button type="button" onClick={addAnalysis}>
                    Ajouter analyse
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Modifier" : "Créer"}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
