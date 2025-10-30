import React from "react";
import { useAuth } from "@/lib/auth-context";
import HistoryTab from "@/components/console/HistoryTab";

export default function ReportPage() {
  const { user } = useAuth();
  const userOnly = user?.role !== "admin";

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Rapport</h1>
      <HistoryTab active={true} userOnly={userOnly} />
    </div>
  );
}
