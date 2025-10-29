import React, { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as DialogUI from "@/components/ui/dialog";

const authFetch = async (input: RequestInfo, init: RequestInit = {}) => {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // First attempt: direct fetch
  try {
    return await fetch(input, { ...init, headers });
  } catch (err) {
    // Network failure — attempt Netlify functions prefix fallback if path starts with /api
    try {
      const base = (window && (window as any).location) ? `${window.location.origin}` : "";
      const asStr = typeof input === "string" ? input : (input as Request).url;
      if (asStr && asStr.startsWith("/api")) {
        const fallback = `/.netlify/functions/api${asStr}`;
        return await fetch(fallback, { ...init, headers });
      }
    } catch (e) {
      // ignore
    }
    throw err;
  }
};

export default function QueuePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedCollector, setSelectedCollector] = useState<string | null>(
    null,
  );
  const [activeItem, setActiveItem] = useState<any | null>(null);

  const isAdmin = user?.role === "admin";
  const isCollector = !!user?.is_collector;

  const { data: collectorsData } = useQuery({
    queryKey: ["collectors"],
    queryFn: async () => {
      const res = await authFetch("/api/collectors");
      if (!res.ok) throw new Error("Failed to load collectors");
      return res.json();
    },
    enabled: isAdmin,
  });

  const collectors: { data: { id: string; email: string }[] } | undefined =
    collectorsData;

  const { data: waitingData } = useQuery({
    queryKey: ["queue", "waiting"],
    queryFn: async () => {
      const res = await authFetch(`/api/queue?status=waiting`);
      if (!res.ok) throw new Error("Failed to load queue");
      return res.json();
    },
  });

  const { data: myData } = useQuery({
    queryKey: ["queue", "mine"],
    queryFn: async () => {
      if (!user) return { data: [] };
      const res = await authFetch(`/api/queue?collector_id=${user.id}`);
      if (!res.ok) throw new Error("Failed to load my queue");
      return res.json();
    },
    enabled: !!user,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, collector_id }: any) => {
      const res = await authFetch(`/api/queue/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ collector_id }),
      });
      if (!res.ok) throw new Error("Assign failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries(["queue"]);
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/queue/${id}/claim`, { method: "POST" });
      if (!res.ok) throw new Error("Claim failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["queue"]),
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/queue/${id}/release`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Release failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["queue"]),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/queue/${id}/complete`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Complete failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["queue"]),
  });

  const waiting: any[] = waitingData?.data ?? [];
  const mine: any[] = myData?.data ?? [];

  const ageFromDob = (dob: string | null) => {
    if (!dob) return "-";
    try {
      const date = new Date(dob);
      const diff = Date.now() - date.getTime();
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      return String(years);
    } catch {
      return "-";
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">File d'attente des prélèvements</h1>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Administration - affectation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Cliquez sur le nom d'un patient pour affecter un préleveur.
            </p>
            <div className="flex gap-3 items-center">
              <label className="text-sm">Sélectionner préleveur</label>
              <select
                className="border rounded px-2 py-1"
                value={selectedCollector ?? ""}
                onChange={(e) => setSelectedCollector(e.target.value || null)}
              >
                <option value="">-- Choisir --</option>
                {collectors?.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.email}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">En attente</h2>
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Nom</th>
                  <th className="px-4 py-2 text-left">Sexe</th>
                  <th className="px-4 py-2 text-left">Âge</th>
                  <th className="px-4 py-2 text-left">Analyses</th>
                  <th className="px-4 py-2 text-left">Médecin demandé</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {waiting.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <button
                        className="text-left text-blue-600 underline"
                        onClick={() => setActiveItem(item)}
                      >
                        {item.patient?.name || item.patient_id}
                      </button>
                    </td>
                    <td className="px-4 py-2">{item.patient?.sex || "-"}</td>
                    <td className="px-4 py-2">{ageFromDob(item.patient?.dob)}</td>
                    <td className="px-4 py-2">
                      {(item.patient?.analyses || [])
                        .map((a: any) => a.name)
                        .join(", ")}
                    </td>
                    <td className="px-4 py-2">{item.patient?.doctor || "-"}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {isAdmin && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              if (!selectedCollector)
                                return alert("Sélectionnez un préleveur");
                              assignMutation.mutate({
                                id: item.id,
                                collector_id: selectedCollector,
                              });
                            }}
                          >
                            Affecter
                          </Button>
                        )}
                        {isCollector && (
                          <Button variant="default" onClick={() => claimMutation.mutate(item.id)}>
                            Prendre
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {waiting.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      Aucune entrée en attente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Mes tâches</h2>
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Nom</th>
                  <th className="px-4 py-2 text-left">Statut</th>
                  <th className="px-4 py-2 text-left">Créé</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mine.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{item.patient?.name || item.patient_id}</td>
                    <td className="px-4 py-2">{item.status}</td>
                    <td className="px-4 py-2">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {item.status !== "in_progress" && (
                          <Button variant="default" onClick={() => claimMutation.mutate(item.id)}>
                            Prendre
                          </Button>
                        )}
                        {item.status === "in_progress" && (
                          <>
                            <Button variant="outline" onClick={() => releaseMutation.mutate(item.id)}>
                              Relâcher
                            </Button>
                            <Button variant="destructive" onClick={() => completeMutation.mutate(item.id)}>
                              Terminer
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {mine.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Aucune tâche assignée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assign dialog */}
      <DialogUI.Dialog open={!!activeItem} onOpenChange={(open) => { if (!open) setActiveItem(null); }}>
        <DialogUI.DialogContent className="sm:max-w-md">
          <DialogUI.DialogHeader>
            <DialogUI.DialogTitle>Affecter un préleveur</DialogUI.DialogTitle>
          </DialogUI.DialogHeader>
          <div className="space-y-4">
            <p>
              Patient: <strong>{activeItem?.patient?.name || activeItem?.patient_id}</strong>
            </p>
            {collectors?.data?.length ? (
              <div className="flex gap-2 items-center">
                <select className="border rounded px-2 py-1 flex-1" value={selectedCollector ?? ""} onChange={(e) => setSelectedCollector(e.target.value || null)}>
                  <option value="">-- Choisir --</option>
                  {collectors?.data?.map((c) => (
                    <option key={c.id} value={c.id}>{c.email}</option>
                  ))}
                </select>
                <Button onClick={() => {
                  if (!selectedCollector) return alert("Sélectionnez un préleveur");
                  assignMutation.mutate({ id: activeItem.id, collector_id: selectedCollector });
                  setActiveItem(null);
                }}>Affecter</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun préleveur disponible</p>
            )}
          </div>
        </DialogUI.DialogContent>
      </DialogUI.Dialog>
    </div>
  );
}
