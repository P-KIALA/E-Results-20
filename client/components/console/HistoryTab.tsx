import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendLogEntry, Doctor } from "@shared/api";
import { Clock, CheckCircle, AlertCircle, Loader } from "lucide-react";

export default function HistoryTab() {
  const [logs, setLogs] = useState<(SendLogEntry & { doctors?: any })[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");

  const getToken = () => localStorage.getItem("auth_token");

  const fetchDoctors = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/doctors", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterDoctor) params.append("doctor_id", filterDoctor);

      const token = getToken();
      const res = await fetch(`/api/send-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDoctor]);

  // Initial load and interval
  useEffect(() => {
    fetchDoctors();
    fetchLogs();
    const interval = setInterval(() => fetchLogs(), 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [fetchDoctors, fetchLogs]);

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
      <div>
        <h3 className="text-lg font-semibold">Historique des envois</h3>
        <p className="text-sm text-muted-foreground">Suivi en temps réel de tous les envois</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
          logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getStatusIcon(log.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{getDoctorName(log.doctor_id)}</p>
                      {log.custom_message && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          "{log.custom_message}"
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {log.sent_at && <span>Envoyé: {new Date(log.sent_at).toLocaleString("fr-FR")}</span>}
                        {log.delivered_at && <span>Livré: {new Date(log.delivered_at).toLocaleString("fr-FR")}</span>}
                        {log.read_at && <span>Lu: {new Date(log.read_at).toLocaleString("fr-FR")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{getStatusLabel(log.status)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("fr-FR")}
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                    )}
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
