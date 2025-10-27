import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { MessageSquare, Upload, FileText, Clock, ShieldCheck, BarChart3 } from "lucide-react";

export default function Index() {
  const [previewName, setPreviewName] = useState("Aïcha");
  const [previewResult, setPreviewResult] = useState("15.5/20");
  const [template, setTemplate] = useState(
    "Bonjour {{nom}},\n\nVotre résultat est: {{resultat}}.\nVous recevrez un reçu par message.\n\n— Équipe Admissions"
  );

  const rendered = template
    .replace(/\{\{\s*nom\s*\}\}/gi, previewName)
    .replace(/\{\{\s*resultat\s*\}\}/gi, previewResult);

  return (
    <div className="relative">
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary mb-4">
                Bienvenu au service E-Resultat du Centre de Diagnostic EYANO
              </h2>
              <p className="text-lg text-muted-foreground">
                Plateforme sécurisée pour la transmission des résultats médicaux via WhatsApp
              </p>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img
                src="https://images.pexels.com/photos/6285370/pexels-photo-6285370.jpeg"
                alt="Centre de diagnostic médical"
                className="w-full h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="container py-20 md:py-28">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary">
                  <MessageSquare size={14} />
                </span>
                Envoi de résultats via WhatsApp API
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
                Envoyez des résultats <span className="text-primary">automatiquement</span> sur WhatsApp
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-prose">
                Importez vos listes, sélectionnez un modèle, et envoyez en masse en toute sécurité. Suivi en temps réel, conformité, et simplicité.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/console"><Button className="h-11 px-6">Commencer</Button></Link>
                <a href="#demo" className="text-sm underline-offset-4 hover:underline">Voir une démo</a>
              </div>
              <div className="mt-6 text-xs text-muted-foreground">Compatible avec l'API WhatsApp Business officielle.</div>
            </div>
            <Card id="demo" className="shadow-sm">
              <CardHeader>
                <CardTitle>Prévisualisation</CardTitle>
                <CardDescription>Modifiez les champs pour voir le rendu du message.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input value={previewName} onChange={(e) => setPreviewName(e.target.value)} placeholder="Nom" />
                  <Input value={previewResult} onChange={(e) => setPreviewResult(e.target.value)} placeholder="Résultat" />
                </div>
                <Textarea rows={6} value={template} onChange={(e) => setTemplate(e.target.value)} />
                <div className="rounded-xl border bg-accent p-4">
                  <div className="mx-auto w-full max-w-sm">
                    <div className="rounded-2xl border bg-background p-4 shadow-sm">
                      <div className="flex items-start gap-2">
                        <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                          <MessageSquare size={16} />
                        </div>
                        <div className="space-y-2">
                          <div className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 whitespace-pre-wrap">
                            {rendered}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Aperçu WhatsApp</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="container py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Tout ce qu'il faut pour envoyer sereinement</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<Upload className="size-4" />} title="Import CSV/Excel" desc="Ajoutez vos destinataires et variables en quelques secondes." />
            <Feature icon={<FileText className="size-4" />} title="Modèles dynamiques" desc="Personnalisez avec {{nom}}, {{resultat}} et plus encore." />
            <Feature icon={<MessageSquare className="size-4" />} title="API WhatsApp" desc="Intégration avec l'API Business officielle (Meta)." />
            <Feature icon={<Clock className="size-4" />} title="Planification" desc="Envoyez maintenant ou programmez pour plus tard." />
            <Feature icon={<BarChart3 className="size-4" />} title="Suivi en temps réel" desc="Statuts: envoyé, délivré, lu, échec." />
            <Feature icon={<ShieldCheck className="size-4" />} title="Sécurité" desc="Chiffrement en transit et bonnes pratiques de conformité." />
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/20">
        <div className="container py-16 text-center">
          <h3 className="text-2xl font-semibold">Prêt à commencer ?</h3>
          <p className="mt-2 text-muted-foreground">Créez votre première campagne en quelques minutes.</p>
          <div className="mt-6">
            <Link to="/console"><Button className="h-11 px-6">Ouvrir la console</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border p-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary">
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
