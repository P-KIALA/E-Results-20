import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DoctorsTab from "@/components/console/DoctorsTab";
import ResultsTab from "@/components/console/ResultsTab";
import HistoryTab from "@/components/console/HistoryTab";
import StatsTab from "@/components/console/StatsTab";

export default function ConsolePage() {
  const [activeTab, setActiveTab] = useState("doctors");

  return (
    <div className="relative py-8">
      {/* Background image behind the console. Replace '/placeholder.svg' in public/ with your image */}
      <div
        className="absolute inset-0 -z-10 bg-center bg-no-repeat bg-cover"
        style={{ backgroundImage: "url('/console-bg.svg')", opacity: 0.08 }}
      />

      <div className="container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Console d'administration
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Gérez les médecins, envoyez les résultats et suivez l'historique en
            temps réel
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="doctors">Médecins</TabsTrigger>
            <TabsTrigger value="results">Résultats</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          <TabsContent value="doctors" className="space-y-6">
            <DoctorsTab />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ResultsTab />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HistoryTab />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <StatsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
