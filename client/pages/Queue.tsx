import React, { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const authFetch = (input: RequestInfo, init: RequestInit = {}) => {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(input, { ...init, headers });
};

export default function QueuePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedCollector, setSelectedCollector] = useState<string | null>(null);

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

  const collectors: { data: { id: string; email: string }[] } | undefined = collectorsData;

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
      const res = await authFetch(`/api/queue/${id}/release`, { method: "POST" });
      if (!res.ok) throw new Error("Release failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["queue"]),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/queue/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Complete failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["queue"]),
  });

  const waiting: any[] = waitingData?.data ?? [];
  const mine: any[] = myData?.data ?? [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">File d'attente des prélèvements</h1>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Administration - affectation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Affecter un préleveur à une entrée de la file.</p>
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
          <CardFooter>
            <p className="text-sm text-muted-foreground">Après sélection, utilisez le bouton "Affecter" sur une entrée.</p>
          </CardFooter>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">En attente</h2>
          <div className="space-y-3">
            {waiting.length === 0 && <p className="text-sm text-muted-foreground">Aucune entrée en attente</p>}
            {waiting.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Patient: {item.patient_id}</h3>
                      <p className="text-sm text-muted-foreground">Créé: {new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (!selectedCollector) return alert("Sélectionnez un préleveur");
                            assignMutation.mutate({ id: item.id, collector_id: selectedCollector });
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
                  </div>
                </CardHeader>
                <CardContent>{item.notes && <p>{item.notes}</p>}</CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Mes tâches</h2>
          <div className="space-y-3">
            {mine.length === 0 && <p className="text-sm text-muted-foreground">Aucune tâche assignée</p>}
            {mine.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Patient: {item.patient_id}</h3>
                      <p className="text-sm text-muted-foreground">Statut: {item.status}</p>
                      <p className="text-sm text-muted-foreground">Créé: {new Date(item.created_at).toLocaleString()}</p>
                    </div>
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
                  </div>
                </CardHeader>
                <CardContent>{item.notes && <p>{item.notes}</p>}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
