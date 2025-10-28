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

export default function StatsTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SiteStats[]>([]);
  const [statusSummary, setStatusSummary] = useState<StatusSummary[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("No auth token found");
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append("limit", "10000");
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      // Fetch all send logs to calculate stats
      const res = await fetch(`/api/send-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch logs");
      }

      const data = await res.json();
      const logs = data.logs || [];

      // Fetch all sites
      const sitesRes = await fetch("/api/sites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!sitesRes.ok) {
        const errorData = await sitesRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch sites");
      }

      const sitesData = await sitesRes.json();
      const sites: Site[] = sitesData.sites || [];

      // Calculate stats per site
      const statsMap: Record<string, SiteStats> = {};

      sites.forEach((site) => {
        statsMap[site.id] = {
          site_id: site.id,
          site_name: site.name,
          total_sent: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
          pending: 0,
        };
      });

      // Count logs by site and status
      logs.forEach((log: any) => {
        const siteName = log.patient_site;
        if (siteName) {
          const site = sites.find((s) => s.name === siteName);
          if (site) {
            const siteKey = site.id;
            if (statsMap[siteKey]) {
              statsMap[siteKey].total_sent++;
              statsMap[siteKey][log.status as keyof SiteStats]++;
            }
          }
        }
      });

      const siteStatsList = Object.values(statsMap).filter(
        (s) => s.total_sent > 0,
      );

      setStats(siteStatsList);

      // Calculate overall status summary
      const statusCounts: Record<string, number> = {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        pending: 0,
      };

      logs.forEach((log: any) => {
        statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
      });

      const total = logs.length;
      setTotalMessages(total);

      const summary: StatusSummary[] = [
        {
          status: "Envoyé",
          count: statusCounts.sent,
          percentage:
            total > 0 ? Math.round((statusCounts.sent / total) * 100) : 0,
        },
        {
          status: "Livré",
          count: statusCounts.delivered,
          percentage:
            total > 0 ? Math.round((statusCounts.delivered / total) * 100) : 0,
        },
        {
          status: "Lu",
          count: statusCounts.read,
          percentage:
            total > 0 ? Math.round((statusCounts.read / total) * 100) : 0,
        },
        {
          status: "Échec",
          count: statusCounts.failed,
          percentage:
            total > 0 ? Math.round((statusCounts.failed / total) * 100) : 0,
        },
        {
          status: "En attente",
          count: statusCounts.pending,
          percentage:
            total > 0 ? Math.round((statusCounts.pending / total) * 100) : 0,
        },
      ];

      setStatusSummary(summary);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = stats.map((s) => ({
    name: s.site_name,
    Envoyé: s.sent,
    Livré: s.delivered,
    Lu: s.read,
    Échec: s.failed,
    "En attente": s.pending,
  }));

  const pieData = statusSummary.filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Statistiques par site</h3>
        <p className="text-sm text-muted-foreground">
          Analyse des envois et des statuts de livraison
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4 items-center">
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

          <Button onClick={fetchStats} disabled={loading}>
            {loading ? "Chargement..." : "Actualiser"}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setStartDate(today);
              setEndDate(today);
              setStats([]);
              setStatusSummary([]);
              setTotalMessages(0);
            }}
            className="px-3 py-2"
          >
            Réinitialiser aux statistiques d'aujourd'hui
          </Button>
        </div>
      </div>

      {/* Total Messages Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            Messages total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalMessages}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Tous les messages envoyés
          </p>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        {statusSummary.map((status) => (
          <Card key={status.status}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{status.status}</p>
                <p className="text-3xl font-bold">{status.count}</p>
                <p className="text-xs text-muted-foreground">
                  {status.percentage}%
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Messages by Site */}
        {chartData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart size={20} />
                Messages par site
              </CardTitle>
              <CardDescription>
                Nombre de messages envoyés par site et statut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Envoyé" stackId="a" fill={STATUS_COLORS.sent} />
                  <Bar
                    dataKey="Livré"
                    stackId="a"
                    fill={STATUS_COLORS.delivered}
                  />
                  <Bar dataKey="Lu" stackId="a" fill={STATUS_COLORS.read} />
                  <Bar
                    dataKey="Échec"
                    stackId="a"
                    fill={STATUS_COLORS.failed}
                  />
                  <Bar
                    dataKey="En attente"
                    stackId="a"
                    fill={STATUS_COLORS.pending}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Aucune donnée disponible
            </CardContent>
          </Card>
        )}

        {/* Pie Chart - Status Distribution */}
        {pieData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart size={20} />
                Distribution des statuts
              </CardTitle>
              <CardDescription>
                Proportion des statuts de livraison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, percentage }) =>
                      `${status} ${percentage}%`
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          STATUS_COLORS[entry.status.toLowerCase()] ||
                          COLORS[index % COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Aucune donnée disponible
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sites Details Table */}
      {stats.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin size={20} />
              Détails par site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Site</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Envoyé</th>
                    <th className="text-right p-2">Livré</th>
                    <th className="text-right p-2">Lu</th>
                    <th className="text-right p-2">Échec</th>
                    <th className="text-right p-2">En attente</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((site) => (
                    <tr key={site.site_id} className="border-b hover:bg-muted">
                      <td className="p-2 font-medium">{site.site_name}</td>
                      <td className="text-right p-2 font-bold">
                        {site.total_sent}
                      </td>
                      <td className="text-right p-2 text-blue-600">
                        {site.sent}
                      </td>
                      <td className="text-right p-2 text-green-600">
                        {site.delivered}
                      </td>
                      <td className="text-right p-2 text-emerald-600">
                        {site.read}
                      </td>
                      <td className="text-right p-2 text-red-600">
                        {site.failed}
                      </td>
                      <td className="text-right p-2 text-amber-600">
                        {site.pending}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucune statistique disponible. Envoyez des messages pour voir les
            statistiques.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
