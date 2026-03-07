import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Send, Printer, CheckCircle, Loader2, Package, User, Truck, AlertTriangle } from "lucide-react";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface GeneratedDoc {
  id: string;
  document_number: string;
  subject: string;
  destination_skpd: string;
  sender: string;
  pic_sender: string | null;
  courier_name: string | null;
  physical_description: string | null;
  urgency: string;
}

const URGENCY_OPTIONS = ["Biasa", "Segera", "Rahasia"] as const;

const urgencyBadge: Record<string, string> = {
  Biasa: "bg-muted text-muted-foreground border-border",
  Segera: "bg-status-transit/15 text-status-transit border-status-transit/30",
  Rahasia: "bg-status-warning/15 text-status-warning border-status-warning/30",
};

export default function Outbox() {
  const { toast } = useToast();
  const { agencyName } = useAuth();
  const [docNumber, setDocNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [destination, setDestination] = useState("");
  const [picSender, setPicSender] = useState("");
  const [courierName, setCourierName] = useState("");
  const [physicalDesc, setPhysicalDesc] = useState("");
  const [urgency, setUrgency] = useState("Biasa");
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);

  useEffect(() => {
    const fetchAgencies = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("agency_name")
        .order("agency_name");
      // Deduplicate and exclude sender's own agency
      const unique = [...new Set(data?.map((p) => p.agency_name) ?? [])];
      setAgencies(unique.filter((a) => a !== agencyName));
      setLoadingAgencies(false);
    };
    fetchAgencies();
  }, [agencyName]);

  const canSubmit = docNumber.trim() && subject.trim() && destination && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from("documents")
      .insert({
        document_number: docNumber.trim(),
        subject: subject.trim(),
        destination_skpd: destination,
        sender: agencyName ?? "BKAD",
        pic_sender: picSender.trim() || null,
        courier_name: courierName.trim() || null,
        physical_description: physicalDesc.trim() || null,
        urgency,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: "Failed to register document. Please try again.", variant: "destructive" });
      return;
    }

    setGeneratedDoc(data as GeneratedDoc);
    toast({ title: "✅ Document Registered", description: `Digital Twin created for ${data.document_number}` });
  };

  const handleReset = () => {
    setDocNumber("");
    setSubject("");
    setDestination("");
    setPicSender("");
    setCourierName("");
    setPhysicalDesc("");
    setUrgency("Biasa");
    setGeneratedDoc(null);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Outbox</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Register outgoing documents from <strong>{agencyName}</strong>
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!generatedDoc ? (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-lg">Register Document</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Document Info */}
                  <div className="space-y-2">
                    <Label htmlFor="doc-number">Document Number *</Label>
                    <Input id="doc-number" placeholder="e.g., SURAT/BKAD/2026/006" value={docNumber} onChange={e => setDocNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input id="subject" placeholder="e.g., Verifikasi Data Aset" value={subject} onChange={e => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination SKPD *</Label>
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
                      <SelectContent>
                        {loadingAgencies ? (
                          <div className="p-2 space-y-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ) : agencies.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No agencies found</div>
                        ) : (
                          agencies.map(skpd => (
                            <SelectItem key={skpd} value={skpd}>{skpd}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Chain of Custody */}
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chain of Custody</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pic-sender">PIC / Pengirim</Label>
                      <Input id="pic-sender" placeholder="e.g., Budi - Subag Umum" value={picSender} onChange={e => setPicSender(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="courier">Kurir / Pengantar</Label>
                      <Input id="courier" placeholder="e.g., Asep / Gojek" value={courierName} onChange={e => setCourierName(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="physical-desc">Deskripsi Fisik</Label>
                      <Input id="physical-desc" placeholder="e.g., 1 Map Kuning" value={physicalDesc} onChange={e => setPhysicalDesc(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Urgensi</Label>
                      <Select value={urgency} onValueChange={setUrgency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {URGENCY_OPTIONS.map(u => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {submitting ? "Registering..." : "Generate Digital Twin & QR"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* ===== SHIPPING LABEL / PRINT TICKET ===== */
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            {/* Non-print actions */}
            <div className="flex gap-3 justify-center mb-4 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print Ticket
              </Button>
              <Button onClick={handleReset}>Register Another</Button>
            </div>

            {/* Printable Ticket */}
            <Card className="shadow-sm border-2 border-dashed border-primary/30 max-w-md mx-auto print:border-solid print:shadow-none">
              <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="text-center border-b-2 border-foreground/20 pb-3">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-semibold">Government Document Tracking</p>
                  <h2 className="text-lg font-extrabold tracking-tight mt-1">DOCUTWIN TRACKING TICKET</h2>
                </div>

                {/* Destination block */}
                <div className="bg-accent rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tujuan / Destination</p>
                  <p className="text-base font-bold mt-0.5">{generatedDoc.destination_skpd}</p>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">Pengirim</p>
                    <p className="font-semibold text-xs">{generatedDoc.sender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">PIC</p>
                    <p className="font-semibold text-xs">{generatedDoc.pic_sender || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">Kurir</p>
                    <p className="font-semibold text-xs flex items-center gap-1">
                      <Truck className="h-3 w-3 print:hidden" />
                      {generatedDoc.courier_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">Urgensi</p>
                    <Badge variant="outline" className={`text-[10px] mt-0.5 ${urgencyBadge[generatedDoc.urgency] || ""}`}>
                      {generatedDoc.urgency === "Rahasia" && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                      {generatedDoc.urgency}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Document info */}
                <div className="space-y-1 text-xs">
                  <p><span className="text-muted-foreground">No. Surat:</span> <span className="font-mono font-semibold">{generatedDoc.document_number}</span></p>
                  <p><span className="text-muted-foreground">Perihal:</span> {generatedDoc.subject}</p>
                  {generatedDoc.physical_description && (
                    <p className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-muted-foreground print:hidden" />
                      <span className="text-muted-foreground">Fisik:</span> {generatedDoc.physical_description}
                    </p>
                  )}
                </div>

                <Separator />

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-card border rounded-lg inline-block">
                    <QRCode value={generatedDoc.id} size={140} level="M" />
                  </div>
                  <p className="text-[9px] text-muted-foreground font-mono select-all">{generatedDoc.id}</p>
                </div>

                {/* Footer */}
                <p className="text-center text-[9px] text-muted-foreground border-t border-dashed border-border pt-2">
                  Tempel label ini pada berkas fisik • Scan QR saat diterima
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
