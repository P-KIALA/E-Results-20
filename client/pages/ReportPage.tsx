import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import HistoryTab from "@/components/console/HistoryTab";

export default function ReportPage() {
  const { user } = useAuth();
  const userOnly = user?.role !== "admin";
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      setExporting(true);
      // Post current filters via body if needed; for now rely on default (today)
      const res = await fetch(`/api/reports/export?format=${format}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Export failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${Date.now()}.${format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(String(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Rapport</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={() => handleExport("csv")} disabled={exporting}>
            Export CSV
          </button>
          <button className="btn" onClick={() => handleExport("xlsx")} disabled={exporting}>
            Export Excel
          </button>
          <button className="btn" onClick={() => handleExport("pdf")} disabled={exporting}>
            Export PDF
          </button>
        </div>
      </div>

      <HistoryTab active={true} userOnly={userOnly} />
    </div>
  );
}
