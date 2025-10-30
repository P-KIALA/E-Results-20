import React from "react";
import { useAuth } from "@/lib/auth-context";
import HistoryTab from "@/components/console/HistoryTab";

export default function HistoryPage() {
  const { user } = useAuth();
  const userOnly = user?.role !== "admin";

  return <HistoryTab active={true} userOnly={userOnly} />;
}
