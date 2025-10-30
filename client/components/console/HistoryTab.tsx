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

interface HistoryTabProps {
  active?: boolean;
  userOnly?: boolean;
}

// Mock data
const MOCK_LOGS: SendLogEntry[] = [
  {
    id: "1",
    doctor_id: "doc1",
    custom_message: "Résultats d'analyse",
    patient_name: "FLORENT",
    patient_site: "LIMETE",
    sender_id: "user1",
    status: "pending",
    sent_at: "2025-01-30T14:59:02Z",
    created_at: "2025-01-30T14:59:02Z",
    updated_at: "2025-01-30T14:59:02Z",
  },
  {
    id: "2",
    doctor_id: "doc2",
    custom_message: "Résultats urgents",
    patient_name: "MARIE",
    patient_site: "KINTAMBO",
    sender_id: "user1",
    status: "sent",
    sent_at: "2025-01-30T12:30:00Z",
    created_at: "2025-01-30T12:30:00Z",
    updated_at: "2025-01-30T12:30:00Z",
  },
];

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

const MOCK_SITES: Site[] = [
  {
    id: "site1",
    name: "LIMETE",
    created_at: "2025-01-30T10:00:00Z",
  },
  {
    id: "site2",
    name: "KINTAMBO",
    created_at: "2025-01-30T10:00:00Z",
  },
];

export default function HistoryTab({
  active = false,
  userOnly = false,
}: HistoryTabProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<(SendLogEntry & { doctors?: any })[]>(MOCK_LOGS);
  const [doctors, setDoctors] = useState<Doctor[]>(MOCK_DOCTORS);
  const [sites, setSites] = useState<Site[]>(MOCK_SITES);
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
  const [total, setTotal] = useState(MOCK_LOGS.length);

  const getToken = () => localStorage.getItem("auth_token");

  // All API calls disabled
  const fetchSites = useCallback(async () => {
    console.log("API calls disabled - using mock data");
  }, []);

  const fetchDoctors = useCallback(async () => {
    console.log("API calls disabled - using mock data");
  }, []);

  const fetchUsers = useCallback(async () => {
    console.log("API calls disabled - using mock data");
  }, []);

  const fetchLogs = useCallback(async () => {
    console.log("API calls disabled - using mock data");
  }, []);

  useEffect(() => {
    if (active) {
      // API calls disabled
      // fetchSites();
      // fetchDoctors();
      // if (!userOnly) {
      //   fetchUsers();
      // }
    }
  }, [active, userOnly]);

  useEffect(() => {
    if (active) {
      // API calls disabled
      // fetchLogs();
    }
  }, [
    active,
    page,
    pageSize,
    filterStatus,
    filterDoctor,
    filterSite,
    filterSender,
    startDate,
    endDate,
    userOnly,
  ]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: string; icon: any }
    > = {
      pending: {
        label: "En attente",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      sent: {
        label: "Envoyé",
        color: "bg-blue-100 text-blue-800",
        icon: CheckCircle,
      },
      delivered: {
        label: "Livré",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      },
      read: {
        label: "Lu",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      },
      failed: {
        label: "Échec",
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
      },
    };
    const { label, color, icon: Icon } = statusMap[status] || statusMap.pending;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${color}`}
      >
        <Icon size={12} />
        {label}
      </span>
    );
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor?.name || doctor?.phone || "Inconnu";
  };

  const filteredLogs = logs.filter((log) => {
    if (filterStatus && log.status !== filterStatus) return false;
    if (filterDoctor && log.doctor_id !== filterDoctor) return false;
    if (filterSite && log.patient_site !== filterSite) return false;
    if (filterSender && log.sender_id !== filterSender) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Historique des envois</h2>
        <p className="text-muted-foreground">
          {userOnly ? "Vos envois récents" : "Tous les envois récents"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium">Statut</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="sent">Envoyé</option>
            <option value="delivered">Livré</option>
            <option value="read">Lu</option>
            <option value="failed">Échec</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Médecin</label>
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled
          >
            <option value="">Tous les médecins</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name || doc.phone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Site</label>
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled
          >
            <option value="">Tous les sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.name}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {!userOnly && (
          <div>
            <label className="text-sm font-medium">Expéditeur</label>
            <select
              value={filterSender}
              onChange={(e) => setFilterSender(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled
            >
              <option value="">Tous les expéditeurs</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Date de début</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled
          />
        </div>
        <div>
          <label className="text-sm font-medium">Date de fin</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled
          />
        </div>
        <div className="flex items-end">
          <Button onClick={() => fetchLogs()} disabled className="w-full">
            Actualiser (désactivé)
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun envoi trouvé
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {getDoctorName(log.doctor_id)}
                    </CardTitle>
                    <CardDescription>
                      {log.patient_name && `Patient: ${log.patient_name}`}
                      {log.patient_name && log.patient_site && " • "}
                      {log.patient_site && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {log.patient_site}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {log.custom_message}
                </p>
                <p className="text-xs text-muted-foreground">
                  Envoyé par: {user?.email || "Inconnu"} •{" "}
                  {new Date(log.sent_at).toLocaleString("fr-FR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Affichage {(page - 1) * pageSize + 1} à{" "}
          {Math.min(page * pageSize, total)} sur {total}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled
          >
            Suivant
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground text-center p-4 border rounded-lg bg-yellow-50">
        <p>⚠️ Mode démonstration : Les appels API sont désactivés. Utilisez <a href="#" onClick={() => window.open(window.location.origin, '_blank')} className="underline text-blue-600">Open Preview</a> pour accéder à toutes les fonctionnalités.</p>
      </div>
    </div>
  );
}
