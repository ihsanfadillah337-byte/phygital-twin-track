import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScanLine, CheckCircle, Loader2, Camera, XCircle, AlertTriangle, Truck, Package, SwitchCamera, VideoOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Scanner } from "@yudiel/react-qr-scanner";

interface ScannedDoc {
  id: string;
  document_number: string;
  subject: string;
  sender: string;
  destination_skpd: string;
  status: string;
  pic_sender: string | null;
  courier_name: string | null;
  physical_description: string | null;
  urgency: string;
}

type ScanState = "idle" | "scanning" | "verified" | "mismatch" | "error";

const urgencyBadge: Record<string, string> = {
  Biasa: "bg-muted text-muted-foreground border-border",
  Segera: "bg-status-transit/15 text-status-transit border-status-transit/30",
  Rahasia: "bg-status-warning/15 text-status-warning border-status-warning/30",
};

const COOLDOWN_MS = 4000;

export default function Inbox() {
  const { toast } = useToast();
  const { user, agencyName } = useAuth();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [verifiedDoc, setVerifiedDoc] = useState<ScannedDoc | null>(null);
  const [mismatchDoc, setMismatchDoc] = useState<ScannedDoc | null>(null);
  const [paused, setPaused] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const processingRef = useRef(false);

  const logScan = async (doc: ScannedDoc, result: "match" | "mismatch") => {
    await supabase.from("scan_logs").insert({
      document_id: doc.id,
      scanned_by: user?.id,
      scanner_agency: agencyName ?? "Unknown",
      expected_agency: doc.destination_skpd,
      result,
    });
  };

  const handleDetected = useCallback(async (rawValue: string) => {
    if (processingRef.current || paused) return;

    const trimmed = rawValue.trim();
    // Basic UUID validation
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return;

    processingRef.current = true;
    setPaused(true);
    setScanState("scanning");

    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", trimmed)
      .maybeSingle();

    if (error || !doc) {
      setScanState("error");
      toast({ title: "❌ Document Not Found", description: "No document matches this QR code.", variant: "destructive" });
      setTimeout(() => {
        setScanState("idle");
        setPaused(false);
        processingRef.current = false;
      }, COOLDOWN_MS);
      return;
    }

    const scannedDoc = doc as ScannedDoc;

    if (scannedDoc.destination_skpd === agencyName) {
      await supabase.from("documents").update({ status: "Received" }).eq("id", scannedDoc.id);
      await logScan(scannedDoc, "match");
      setVerifiedDoc({ ...scannedDoc, status: "Received" });
      setScanState("verified");
      toast({ title: "✅ Match Verified!", description: `Document ${scannedDoc.document_number} received successfully.` });
    } else {
      await logScan(scannedDoc, "mismatch");
      setMismatchDoc(scannedDoc);
      setScanState("mismatch");
    }

    // Cooldown before allowing next scan
    setTimeout(() => {
      processingRef.current = false;
    }, COOLDOWN_MS);
  }, [agencyName, paused, toast, user?.id]);

  const handleReset = () => {
    setScanState("idle");
    setVerifiedDoc(null);
    setMismatchDoc(null);
    setPaused(false);
    processingRef.current = false;
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inbox Scanner</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scan & verify incoming documents for <strong>{agencyName}</strong>
        </p>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              QR Scanner Kiosk
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={toggleCamera} className="text-xs gap-1.5">
              <SwitchCamera className="h-4 w-4" />
              Flip
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Camera Viewfinder */}
          {cameraError ? (
            <div className="aspect-square max-w-[350px] mx-auto rounded-xl border-2 border-dashed border-status-warning/50 bg-status-warning/5 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <VideoOff className="h-12 w-12 text-status-warning/60" />
              <p className="text-sm font-medium text-status-warning">Camera Access Denied</p>
              <p className="text-xs text-muted-foreground">{cameraError}</p>
              <Button variant="outline" size="sm" onClick={() => setCameraError(null)}>
                Retry
              </Button>
            </div>
          ) : (
            <div className={`relative max-w-[350px] mx-auto rounded-xl border-2 overflow-hidden transition-colors ${
              scanState === "verified" ? "border-status-received" :
              scanState === "mismatch" ? "border-status-warning" :
              scanState === "scanning" ? "border-primary animate-pulse" :
              "border-primary/30"
            }`}>
              {/* Corner markers */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl z-10 pointer-events-none" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr z-10 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl z-10 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br z-10 pointer-events-none" />

              {/* Scanner overlay for states */}
              <AnimatePresence>
                {(scanState === "verified" || scanState === "mismatch" || scanState === "scanning") && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 z-20 flex items-center justify-center ${
                      scanState === "verified" ? "bg-status-received/20" :
                      scanState === "mismatch" ? "bg-status-warning/20" :
                      "bg-primary/10"
                    }`}
                  >
                    {scanState === "scanning" && <Loader2 className="h-16 w-16 text-primary animate-spin" />}
                    {scanState === "verified" && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                        <CheckCircle className="h-24 w-24 text-status-received drop-shadow-lg" />
                      </motion.div>
                    )}
                    {scanState === "mismatch" && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                        <XCircle className="h-24 w-24 text-status-warning drop-shadow-lg" />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <Scanner
                key={facingMode}
                onScan={(detectedCodes) => {
                  if (detectedCodes.length > 0) {
                    handleDetected(detectedCodes[0].rawValue);
                  }
                }}
                onError={(err) => {
                  if (err instanceof Error) {
                    setCameraError(err.message.includes("Permission")
                      ? "Please allow camera access in your browser settings to scan documents."
                      : err.message);
                  }
                }}
                formats={["qr_code"]}
                paused={paused}
                constraints={{ facingMode }}
                styles={{
                  container: { width: "100%", aspectRatio: "1" },
                  video: { objectFit: "cover" as const },
                }}
                components={{
                  finder: false,
                }}
              />
            </div>
          )}

          {/* Status indicator */}
          {scanState === "idle" && !cameraError && (
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-status-received animate-pulse" />
              Camera active — point at a QR code to scan
            </p>
          )}

          {/* Verified result */}
          <AnimatePresence>
            {scanState === "verified" && verifiedDoc && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-status-received/10 border border-status-received/30 space-y-3"
              >
                <p className="font-semibold text-status-received text-sm">
                  ✅ Match! Document Received Successfully
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Document:</strong> {verifiedDoc.document_number}</p>
                  <p><strong>Subject:</strong> {verifiedDoc.subject}</p>
                  <p><strong>From:</strong> {verifiedDoc.sender}</p>
                </div>
                <Separator />
                <div className="text-xs space-y-1">
                  {verifiedDoc.courier_name && (
                    <p className="flex items-center gap-1">
                      <Truck className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Delivered by:</span>
                      <span className="font-semibold">{verifiedDoc.courier_name}</span>
                    </p>
                  )}
                  {verifiedDoc.physical_description && (
                    <p className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Fisik:</span>
                      <span className="font-semibold">{verifiedDoc.physical_description}</span>
                    </p>
                  )}
                  {verifiedDoc.urgency && verifiedDoc.urgency !== "Biasa" && (
                    <Badge variant="outline" className={`text-[10px] ${urgencyBadge[verifiedDoc.urgency] || ""}`}>
                      {verifiedDoc.urgency}
                    </Badge>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset button after scan */}
          {(scanState === "verified" || scanState === "mismatch") && (
            <Button className="w-full" onClick={handleReset}>
              <ScanLine className="mr-2 h-4 w-4" />
              Scan Another Document
            </Button>
          )}
        </CardContent>
      </Card>

      {/* MISMATCH DIALOG */}
      <Dialog open={scanState === "mismatch"} onOpenChange={(open) => { if (!open) handleReset(); }}>
        <DialogContent className="border-status-warning/50 max-w-md">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-status-warning/15">
              <AlertTriangle className="h-9 w-9 text-status-warning" />
            </div>
            <DialogTitle className="text-status-warning text-xl">
              ❌ MISMATCH WARNING!
            </DialogTitle>
            <DialogDescription className="text-base">
              This document is <strong>NOT</strong> meant for your agency.
            </DialogDescription>
          </DialogHeader>

          {mismatchDoc && (
            <div className="rounded-lg bg-status-warning/5 border border-status-warning/20 p-4 space-y-2 text-sm">
              <p><strong>Document:</strong> {mismatchDoc.document_number}</p>
              <p><strong>Subject:</strong> {mismatchDoc.subject}</p>
              <p><strong>Intended for:</strong> <span className="font-bold text-status-warning">{mismatchDoc.destination_skpd}</span></p>
              <p><strong>Your agency:</strong> {agencyName}</p>
              {mismatchDoc.courier_name && (
                <>
                  <Separator />
                  <p className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    <strong>Delivered by:</strong> {mismatchDoc.courier_name}
                  </p>
                </>
              )}
            </div>
          )}

          <p className="text-center text-sm font-semibold text-status-warning">
            🚫 Do NOT accept the physical file. Return it to the courier.
          </p>

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={handleReset}>
              Understood — Scan Another
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
