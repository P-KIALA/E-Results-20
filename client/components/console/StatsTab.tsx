import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  MapPin,
} from "lucide-react";
import type { Site } from "@shared/api";

interface SiteStats {
  site_id: string;
  site_name: string;
  total_sent: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}

interface StatusSummary {
  status: string;
  count: number;
  percentage: number;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const STATUS_COLORS: Record<string, string> = {
  sent: "#3b82f6",
  delivered: "#10b981",
  read: "#059669",
  failed: "#ef4444",
  pending: "#f59e0b",
};

// Mock data for demonstration
const MOCK_STATS: SiteStats[] = [
  {
    site_id: "1",
    site_name: "LIMETE",
    total_sent: 12,
    sent: 8,
    delivered: 2,
    read: 1,
    failed: 1,
    pending: 0,
  },
  {
    site_id: "2",
    site_name: "KINTAMBO",
    total_sent: 5,
    sent: 3,
    delivered: 1,
    read: 0,
    failed: 0,
    pending: 1,
  },
];

const MOCK_STATUS_SUMMARY: StatusSummary[] = [
  { status: "Envoyé", count: 11, percentage: 64.7 },
  { status: "Livré", count: 3, percentage: 17.6 },
  { status: "Lu", count: 1, percentage: 5.9 },
  { status: "Échec", count: 1, percentage: 5.9 },
  { status: "En attente", count: 1, percentage: 5.9 },
];

export default function StatsTab({ userOnly = false }: { userOnly?: boolean }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<SiteStats[]>(MOCK_STATS);
  const [statusSummary, setStatusSummary] = useState<StatusSummary[]>(MOCK_STATUS_SUMMARY);
  const [totalMessages, setTotalMessages] = useState(17);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    // API calls disabled - using mock data
    // fetchStats();
  }, []);

  const fetchStats = async () => {
    // All API calls disabled to prevent iframe errors
    // Using mock data instead
    console.log("API calls disabled - using mock data");
  };

  const getStatusCount = (status: string) => {
    return stats.reduce((sum, site) => {
      if (status === "sent") return sum + site.sent;
      if (status === "delivered") return sum + site.delivered;
      if (status === "read") return sum + site.read;
      if (status === "failed") return sum + site.failed;
      if (status === "pending") return sum + site.pending;
      return sum;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Statistiques par site
        </h2>
        <p className="text-muted-foreground">
          {userOnly ? "Vos statistiques" : "Aperçu des envois par site"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Date de début</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled
          />
        </div>
        <div>
          <label className="text-sm font-medium">Date de fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled
          />
        </div>
        <div className="flex items-end">
          <Button onClick={fetchStats} disabled className="w-full">
            Actualiser (désactivé)
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Chargement...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Messages total
                </CardTitle>
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMessages}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Envoyé</CardTitle>
                <MessageSquare
                  className="w-4 h-4"
                  style={{ color: STATUS_COLORS.sent }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getStatusCount("sent")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Livré</CardTitle>
                <CheckCircle
                  className="w-4 h-4"
                  style={{ color: STATUS_COLORS.delivered }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getStatusCount("delivered")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Lu</CardTitle>
                <CheckCircle
                  className="w-4 h-4"
                  style={{ color: STATUS_COLORS.read }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getStatusCount("read")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Échec</CardTitle>
                <AlertCircle
                  className="w-4 h-4"
                  style={{ color: STATUS_COLORS.failed }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getStatusCount("failed")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  En attente
                </CardTitle>
                <Clock
                  className="w-4 h-4"
                  style={{ color: STATUS_COLORS.pending }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getStatusCount("pending")}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Messages par site</CardTitle>
                <CardDescription>
                  Nombre total de messages envoyés par site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="site_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_sent" fill="#3b82f6" name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribution des statuts</CardTitle>
                <CardDescription>
                  Répartition des messages par statut
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusSummary}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.status}: ${entry.count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {statusSummary.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {stats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Détails par site</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.map((site) => (
                    <div
                      key={site.site_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-semibold">{site.site_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Total: {site.total_sent} messages
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span
                          className="px-2 py-1 rounded"
                          style={{
                            backgroundColor: STATUS_COLORS.sent + "20",
                            color: STATUS_COLORS.sent,
                          }}
                        >
                          {site.sent} envoyé
                        </span>
                        <span
                          className="px-2 py-1 rounded"
                          style={{
                            backgroundColor: STATUS_COLORS.delivered + "20",
                            color: STATUS_COLORS.delivered,
                          }}
                        >
                          {site.delivered} livré
                        </span>
                        <span
                          className="px-2 py-1 rounded"
                          style={{
                            backgroundColor: STATUS_COLORS.read + "20",
                            color: STATUS_COLORS.read,
                          }}
                        >
                          {site.read} lu
                        </span>
                        {site.failed > 0 && (
                          <span
                            className="px-2 py-1 rounded"
                            style={{
                              backgroundColor: STATUS_COLORS.failed + "20",
                              color: STATUS_COLORS.failed,
                            }}
                          >
                            {site.failed} échec
                          </span>
                        )}
                        {site.pending > 0 && (
                          <span
                            className="px-2 py-1 rounded"
                            style={{
                              backgroundColor: STATUS_COLORS.pending + "20",
                              color: STATUS_COLORS.pending,
                            }}
                          >
                            {site.pending} attente
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      <div className="text-sm text-muted-foreground text-center p-4 border rounded-lg bg-yellow-50">
        <p>⚠️ Mode démonstration : Les appels API sont désactivés. Utilisez <a href="#" onClick={() => window.open(window.location.origin, '_blank')} className="underline text-blue-600">Open Preview</a> pour accéder à toutes les fonctionnalités.</p>
      </div>
    </div>
  );
}
