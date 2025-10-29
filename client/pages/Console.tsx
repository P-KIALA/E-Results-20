import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DoctorsTab from "@/components/console/DoctorsTab";
import ResultsTab from "@/components/console/ResultsTab";
import HistoryTab from "@/components/console/HistoryTab";
import StatsTab from "@/components/console/StatsTab";
import PatientsTab from "@/components/console/PatientsTab";

export default function ConsolePage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "doctors");

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="relative py-8">
      {/* Background image behind the console. Replace '/placeholder.svg' in public/ with your image */}
      <div
        className="absolute inset-0 -z-10 bg-center bg-no-repeat bg-cover"
        style={{ backgroundImage: "url('/console-bg.svg')", opacity: 0.08 }}
      />

      <div className="container">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsContent value="doctors" className="space-y-6">
            <DoctorsTab />
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <PatientsTab />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ResultsTab />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HistoryTab active={activeTab === "history"} />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <StatsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
