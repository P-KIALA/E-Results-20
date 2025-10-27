import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function ConsolePage() {
  const [template, setTemplate] = useState("Bonjour {{nom}},\nVotre résultat est: {{resultat}}.\nMerci.");

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Console d'envoi</h1>
        <p className="text-muted-foreground">Importez un fichier, sélectionnez un modèle et envoyez via l'API WhatsApp.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import des destinataires</CardTitle>
            <CardDescription>CSV/Excel avec colonnes: phone, nom, resultat, ...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
            <div className="flex items-center gap-3">
              <Button variant="secondary">Télécharger un exemple</Button>
              <Button>Analyser</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modèle de message</CardTitle>
            <CardDescription>Utilisez des variables comme {{nom}} et {{resultat}}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={8} />
            <div className="flex items-center gap-3">
              <Button variant="outline">Prévisualiser</Button>
              <Button>Envoyer un test</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Suivi</CardTitle>
            <CardDescription>Les envois apparaîtront ici avec leur statut en temps réel.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-muted-foreground">En file d'attente</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-muted-foreground">Envoyés</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-muted-foreground">Livrés</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-muted-foreground">Échecs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
