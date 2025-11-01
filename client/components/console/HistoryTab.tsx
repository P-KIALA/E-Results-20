import { useState, useEffect, useCallback } from "react";
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
import { SendLogEntry, Doctor, Site } from "@shared/api";
import { Clock, CheckCircle, AlertCircle, Loader, MapPin } from "lucide-react";
import { authFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HistoryTabProps {
  active?: boolean;
  userOnly?: boolean; // if true, only show current user's history and limit filters
}

export default function HistoryTab({
  active = false,
  userOnly = false,
}: HistoryTabProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<(SendLogEntry & { doctors?: any })[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [filterSender, setFilterSender] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<
    null | (SendLogEntry & { doctors?: any })
  >(null);
  const [logFiles, setLogFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logs client-side by doctor name when a search query is provided
  const filteredLogs = (logs || []).filter((l) => {
    if (!searchQuery || searchQuery.trim().length === 0) return true; // no search -> keep all
    const q = searchQuery.toLowerCase().trim();
    const doctorName = ((l as any).doctors?.name || getDoctorName(l.doctor_id) || "").toLowerCase();
    return doctorName.includes(q);
  });

  const getToken = () => localStorage.getItem("auth_token");

  // Helper to robustly call the API; falls back to absolute fetch if authFetch fails
  const safeFetch = async (path: string, init: RequestInit = {}) => {
    try {
      return await authFetch(path, init);
    } catch (err) {
      try {
        console.warn("safeFetch: authFetch failed, trying absolute fetch", {
          path,
          err,
        });
        const token = localStorage.getItem("auth_token");
        const headers: Record<string, string> = {
          ...((init.headers as Record<string, string>) || {}),
        };
        if (!headers["Content-Type"] && !(init.body instanceof FormData)) {
          headers["Content-Type"] = "application/json";
        }
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Try relative path first (works in iframe), then absolute
        try {
          return await fetch(path, { ...init, headers } as RequestInit);
        } catch (e) {
          try {
            const absolute = `${window.location.origin}${path}`;
            return await fetch(absolute, { ...init, headers } as RequestInit);
          } catch (_) {}
          throw e;
        }
      } catch (err2) {
        console.error("safeFetch: all fetch attempts failed", {
          path,
          err,
          err2,
        });
        throw err2 || err;
      }
    }
  };

  // Open files modal for a specific send log
  const openFilesForLog = async (log: any) => {
    setSelectedLog(log);
    setFilesModalOpen(true);
    setFilesLoading(true);
    setLogFiles([]);
    try {
      const res = await safeFetch(`/api/send-logs/${log.id}/files`);
      if (!res.ok) {
        // Try to extract JSON error if present using a clone so we don't consume the original stream
        let errText = `HTTP ${res.status}`;
        try {
          const errBody = await res
            .clone()
            .json()
            .catch(() => null);
          if (errBody && errBody.error) errText = errBody.error;
        } catch (_) {}
        throw new Error(errText);
      }

      // Ensure response is JSON; if not, read as text for debugging using clone
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        const txt = await res.clone().text();
        console.error("getSendLogFiles: expected JSON but got:", txt);
        throw new Error("Réponse inattendue du serveur (non JSON)");
      }

      const data = await res.clone().json();
      setLogFiles(data.files || []);
    } catch (e: any) {
      console.error("Failed to load files for log", e);
      setLogFiles([]);
      setMessage({
        type: "error",
        text: e?.message || "Impossible de charger les fichiers",
      });
    } finally {
      setFilesLoading(false);
    }
  };

  const openFileUrl = async (storagePath: string) => {
    try {
      const res = await safeFetch(
        `/api/file-url?storage_path=${encodeURIComponent(storagePath)}`,
      );
      if (!res.ok) {
        let errText = `HTTP ${res.status}`;
        try {
          const errBody = await res
            .clone()
            .json()
            .catch(() => null);
          if (errBody && errBody.error) errText = errBody.error;
        } catch (_) {}
        throw new Error(errText);
      }

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        const txt = await res.clone().text();
        console.error("getFileUrl: expected JSON but got:", txt);
        throw new Error("Réponse inattendue du serveur");
      }

      const data = await res.clone().json();
      if (data && data.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      console.error("Failed to get file URL", e);
      setMessage({
        type: "error",
        text: e?.message || "Impossible d'ouvrir le fichier",
      });
    }
  };

  const resendFilesToDoctor = async () => {
    if (!selectedLog) return;
    if (logFiles.length === 0) {
      setMessage({ type: "error", text: "Aucun fichier à renvoyer" });
      return;
    }
    setResendLoading(true);
    try {
      const payload = {
        doctor_ids: [selectedLog.doctor_id],
        custom_message: (selectedLog as any).custom_message || "",
        file_ids: logFiles.map((f) => f.id),
      };
      const res = await safeFetch(`/api/send-results`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res
          .clone()
          .json()
          .catch(() => ({}));
        throw new Error(err.error || "Failed to resend files");
      }
      setMessage({ type: "success", text: "Fichiers renvoyés avec succès" });
      setFilesModalOpen(false);
      // refresh logs
      await fetchLogs();
    } catch (e: any) {
      console.error("Failed to resend files:", e);
      setMessage({
        type: "error",
        text: e?.message || "Erreur lors du renvoi",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const fetchSites = useCallback(async () => {
    try {
      const res = await safeFetch("/api/sites");
      if (!res.ok) throw new Error("Failed to fetch sites");
      const data = await res.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error("Error fetching sites:", error);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await safeFetch("/api/doctors");
      if (!res.ok) throw new Error("Failed to fetch doctors");
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await safeFetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterDoctor) params.append("doctor_id", filterDoctor);
      if (filterSite) params.append("site_id", filterSite);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (filterSender) params.append("sender_id", filterSender);

      // pagination
      params.append("limit", String(pageSize));
      params.append("offset", String((page - 1) * pageSize));

      // If userOnly, limit to current user's sends
      if (userOnly && user?.id) {
        params.append("sender_id", user.id);
      } else if (filterSender) {
        params.append("sender_id", filterSender);
      }

      const res = await safeFetch(`/api/send-logs?${params}`);

      if (!res.ok) {
        let errMsg = `Failed to fetch logs: ${res.status}`;
        try {
          const errBody = await res
            .clone()
            .json()
            .catch(() => ({}));
          if (errBody && errBody.error) errMsg = errBody.error;
        } catch (e) {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.clone().json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [
    filterStatus,
    filterDoctor,
    filterSite,
    filterSender,
    startDate,
    endDate,
    page,
    pageSize,
  ]);

  // When the history tab becomes active, default to today's stats and fetch logs
  useEffect(() => {
    if (active) {
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(today);
      setPage(1);
      // load supporting lists then logs
      (async () => {
        setLoading(true);
        try {
          if (!userOnly) {
            await fetchSites();
            await fetchUsers();
          }
          await fetchDoctors();
          if (userOnly && user?.id) {
            setFilterSender(user.id);
          }
          await fetchLogs();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [active]);

  // Refetch logs when filters or pagination change while active
  useEffect(() => {
    if (active) {
      fetchLogs();
    }
  }, [
    active,
    filterStatus,
    filterDoctor,
    filterSite,
    filterSender,
    page,
    pageSize,
  ]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle size={16} className="text-blue-600" />;
      case "delivered":
        return <CheckCircle size={16} className="text-green-600" />;
      case "read":
        return <CheckCircle size={16} className="text-green-700 font-bold" />;
      case "failed":
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Loader size={16} className="text-amber-600 animate-spin" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      sent: "Envoyé",
      delivered: "Livré",
      read: "Lu",
      failed: "Échec",
    };
    return labels[status || "pending"] || status || "?";
  };

  const getDoctorName = (doctorId: string) => {
    return doctors.find((d) => d.id === doctorId)?.name || "Inconnu";
  };

  return (
    <div className="space-y-6">
      <div />

      <div className="space-y-4 mt-6">
        <div className="grid gap-4 sm:grid-cols-7 items-center">
          {!userOnly && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="sent">Envoyé</option>
              <option value="delivered">Livré</option>
              <option value="read">Lu</option>
              <option value="failed">Échec</option>
            </select>
          )}

          {!userOnly && (
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="">Tous les médecins</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {!userOnly && (
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="">Tous les sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {!userOnly && (
            <select
              value={filterSender}
              onChange={(e) => setFilterSender(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="">Tous les expéditeurs</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          )}

          {/* Search by doctor name (client-side) */}
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Recherche médecin</label>
            <Input
              placeholder="Rechercher par nom du médecin"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
            />
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-md border bg-background text-sm"
            title="Date de début"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-md border bg-background text-sm"
            title="Date de fin"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              try {
                await fetchLogs();
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="px-3 py-2"
          >
            Actualiser
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground">Chargement...</p>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Aucun envoi pour le moment
            </CardContent>
          </Card>
        ) : (
          <>
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getStatusIcon(log.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {getDoctorName(log.doctor_id)}
                        </p>
                        {log.patient_name && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            Patient: {log.patient_name}
                          </p>
                        )}

                        <p className="text-sm text-muted-foreground">
                          Envoyé par: {log.sender?.email || "Inconnu"}
                          {log.sender?.site ? ` — ${log.sender.site}` : ""}
                        </p>

                        {log.patient_site && (
                          <p className="text-sm text-muted-foreground">
                            Site du centre: {log.patient_site}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          {log.sent_at && (
                            <span>
                              Envoyé:{" "}
                              {new Date(log.sent_at).toLocaleString("fr-FR")}
                            </span>
                          )}
                          {log.delivered_at && (
                            <span>
                              Livré:{" "}
                              {new Date(log.delivered_at).toLocaleString(
                                "fr-FR",
                              )}
                            </span>
                          )}
                          {log.read_at && (
                            <span>
                              Lu:{" "}
                              {new Date(log.read_at).toLocaleString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {getStatusLabel(log.status)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("fr-FR")}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-600 mt-1">
                          {log.error_message}
                        </p>
                      )}

                      <div className="mt-2 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFilesForLog(log)}
                        >
                          Fichiers
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Files dialog */}
            <Dialog
              open={filesModalOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setFilesModalOpen(false);
                  setSelectedLog(null);
                  setLogFiles([]);
                } else {
                  setFilesModalOpen(true);
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fichiers uploadés</DialogTitle>
                  <DialogDescription>
                    Visualiser les fichiers associés et les renvoyer au médecin.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  {filesLoading ? (
                    <p>Chargement des fichiers...</p>
                  ) : logFiles.length === 0 ? (
                    <p className="text-muted-foreground">
                      Aucun fichier attaché à cet envoi.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-60 overflow-auto">
                      {logFiles.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="truncate text-sm">
                            {f.file_name || f.storage_path}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openFileUrl(f.storage_path)}
                            >
                              Ouvrir
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <DialogFooter>
                  <div className="flex items-center justify-between w-full">
                    <div />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setFilesModalOpen(false);
                          setSelectedLog(null);
                          setLogFiles([]);
                        }}
                      >
                        Fermer
                      </Button>
                      <Button
                        onClick={resendFilesToDoctor}
                        disabled={resendLoading || logFiles.length === 0}
                      >
                        {resendLoading ? "Envoi..." : "Renvoyer au médecin"}
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm">Afficher</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 border rounded"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm">par page</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </button>
                <div className="text-sm">
                  Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
                </div>
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() =>
                    setPage((p) =>
                      Math.min(Math.max(1, Math.ceil(total / pageSize)), p + 1),
                    )
                  }
                  disabled={page >= Math.ceil(total / pageSize)}
                >
                  Suivant
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
