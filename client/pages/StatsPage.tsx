import React from "react";
import { useAuth } from "@/lib/auth-context";
import StatsTab from "@/components/console/StatsTab";

export default function StatsPage() {
  const { user } = useAuth();
  const userOnly = user?.role !== "admin";

  return <StatsTab userOnly={userOnly} />;
}
