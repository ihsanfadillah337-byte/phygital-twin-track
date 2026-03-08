import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Archive, Truck, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface ReceivedDocument {
  id: string;
  document_number: string;
  destination_skpd: string;
  updated_at: string;
  courier_name: string | null;
  status: string;
  sender: string;
}

export default function History() {
  const { agencyName, role } = useAuth();
  const [documents, setDocuments] = useState<ReceivedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReceivedDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("id, document_number, destination_skpd, updated_at, courier_name, status, sender")
      .eq("status", "Received")
      .order("updated_at", { ascending: false });

    if (!error && data) setDocuments(data as ReceivedDocument[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchReceivedDocuments();

    const channel = supabase
      .channel("history-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        fetchReceivedDocuments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isSuperAdmin = role === "super_admin";

  // Filter by role: super admin sees all, regular users see their agency's docs
  const roleFilteredDocs = useMemo(() => {
    if (isSuperAdmin) return documents;
    return documents.filter(
      (d) => d.destination_skpd === agencyName || d.sender === agencyName
    );
  }, [documents, isSuperAdmin, agencyName]);

  // Apply search filter
  const filteredDocuments = useMemo(() => {
    if (searchQuery === "") return roleFilteredDocs;
    const q = searchQuery.toLowerCase();
    return roleFilteredDocs.filter(
      (doc) =>
        doc.document_number.toLowerCase().includes(q) ||
        (doc.courier_name && doc.courier_name.toLowerCase().includes(q))
    );
  }, [roleFilteredDocs, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary opacity-80" />
          History
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Audit trail of all received &amp; completed deliveries.
        </p>
      </div>

      {/* Summary Card */}
      <Card className="shadow-sm">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Received
            </p>
            {loading ? (
              <Skeleton className="h-9 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-1">{roleFilteredDocs.length}</p>
            )}
          </div>
          <CheckCircle2 className="h-8 w-8 text-status-received opacity-80" />
        </CardContent>
      </Card>

      {/* Search Bar */}
      <Card className="shadow-sm border-dashed">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by document number or courier name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Document Number</TableHead>
                <TableHead className="font-semibold">Destination SKPD</TableHead>
                <TableHead className="font-semibold">Received Date</TableHead>
                <TableHead className="font-semibold">Courier</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {searchQuery ? "No received documents match your search." : "No received documents yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-xs">{doc.document_number}</TableCell>
                    <TableCell className="text-sm">{doc.destination_skpd}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(doc.updated_at), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {doc.courier_name ? (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          {doc.courier_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-status-received/15 text-status-received border-status-received/30">
                        Received
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
