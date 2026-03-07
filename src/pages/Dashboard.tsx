import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Truck, CheckCircle2, AlertTriangle, Shield, Package, ChevronDown, ChevronUp, Search, CalendarIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface Document {
  id: string;
  document_number: string;
  subject: string;
  sender: string;
  destination_skpd: string;
  status: string;
  created_at: string;
  updated_at: string;
  pic_sender: string | null;
  courier_name: string | null;
  physical_description: string | null;
  urgency: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "bg-status-pending/15 text-status-pending border-status-pending/30" },
  "In Transit": { label: "In Transit", className: "bg-status-transit/15 text-status-transit border-status-transit/30" },
  Received: { label: "Received", className: "bg-status-received/15 text-status-received border-status-received/30" },
  "Mismatch Warning": { label: "Warning", className: "bg-status-warning/15 text-status-warning border-status-warning/30" },
  "Wrong Delivery": { label: "Wrong Delivery", className: "bg-status-warning/15 text-status-warning border-status-warning/30" },
};

const urgencyBadge: Record<string, string> = {
  Biasa: "bg-muted text-muted-foreground border-border",
  Segera: "bg-status-transit/15 text-status-transit border-status-transit/30",
  Rahasia: "bg-status-warning/15 text-status-warning border-status-warning/30",
};

function DocumentTable({ documents, loading, emptyMessage }: { documents: Document[]; loading: boolean; emptyMessage: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Apply filters to documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Search Query Filter (doc number or subject)
      const matchesSearch =
        searchQuery === "" ||
        doc.document_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.subject.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Status Filter
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

      // 3. Urgency Filter
      const matchesUrgency = urgencyFilter === "all" || doc.urgency === urgencyFilter;

      // 4. Date Range Filter (based on updated_at)
      let matchesDate = true;
      if (dateRange?.from) {
        const docDate = new Date(doc.updated_at);
        if (dateRange.to) {
          matchesDate = isWithinInterval(docDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          });
        } else {
          // If only 'from' is selected, match that exact day
          matchesDate = isWithinInterval(docDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.from),
          });
        }
      }

      return matchesSearch && matchesStatus && matchesUrgency && matchesDate;
    });
  }, [documents, searchQuery, statusFilter, urgencyFilter, dateRange]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setDateRange(undefined);
  };

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || urgencyFilter !== "all" || dateRange !== undefined;

  return (
    <div className="space-y-4">
      {/* Advanced Search & Filter Bar */}
      <Card className="shadow-sm border-dashed">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search doc number or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Transit">In Transit</SelectItem>
              <SelectItem value="Received">Received</SelectItem>
              <SelectItem value="Mismatch Warning">Warning</SelectItem>
            </SelectContent>
          </Select>

          {/* Urgency Filter */}
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgency</SelectItem>
              <SelectItem value="Biasa">Biasa</SelectItem>
              <SelectItem value="Segera">Segera</SelectItem>
              <SelectItem value="Rahasia">Rahasia</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Picker Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[220px] h-9 justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Select Date Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8" />
                <TableHead className="font-semibold">Document Number</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">From</TableHead>
                <TableHead className="font-semibold">Destination</TableHead>
                <TableHead className="font-semibold">Urgency</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {hasActiveFilters ? "No documents match your filters." : emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => {
                  const sc = statusConfig[doc.status] || statusConfig["Pending"];
                  const isExpanded = expandedId === doc.id;
                  const hasDetails = doc.pic_sender || doc.courier_name || doc.physical_description;
                  return (
                    <div key={doc.id} className="contents">
                      <TableRow
                        className={hasDetails ? "cursor-pointer hover:bg-muted/30" : ""}
                        onClick={() => hasDetails && setExpandedId(isExpanded ? null : doc.id)}
                      >
                        <TableCell className="w-8 px-2">
                          {hasDetails && (
                            isExpanded
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{doc.document_number}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{doc.subject}</TableCell>
                        <TableCell className="text-sm">{doc.sender}</TableCell>
                        <TableCell className="text-sm">{doc.destination_skpd}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${urgencyBadge[doc.urgency] || urgencyBadge["Biasa"]}`}>
                            {doc.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(doc.updated_at), "dd MMM yyyy, HH:mm")}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasDetails && (
                        <TableRow key={`${doc.id}-details`}>
                          <TableCell />
                          <TableCell colSpan={7}>
                            <div className="flex flex-wrap gap-4 py-1 text-xs text-muted-foreground">
                              {doc.pic_sender && <span>👤 PIC: <strong className="text-foreground">{doc.pic_sender}</strong></span>}
                              {doc.courier_name && <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Kurir: <strong className="text-foreground">{doc.courier_name}</strong></span>}
                              {doc.physical_description && <span className="flex items-center gap-1"><Package className="h-3 w-3" /> Fisik: <strong className="text-foreground">{doc.physical_description}</strong></span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </div>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { agencyName, role } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error && data) setDocuments(data as Document[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();

    const channel = supabase
      .channel("documents-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        fetchDocuments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isSuperAdmin = role === "super_admin";
  const incoming = documents.filter(d => d.destination_skpd === agencyName);
  const outgoing = documents.filter(d => d.sender === agencyName);

  const totalDocs = documents.length;
  const inTransit = documents.filter(d => d.status === "In Transit").length;
  const received = documents.filter(d => d.status === "Received").length;
  const warnings = documents.filter(d => d.status === "Mismatch Warning" || d.status === "Wrong Delivery").length;

  const metrics = [
    { label: "Total Documents", value: totalDocs, icon: FileText, color: "text-primary" },
    { label: "In Transit", value: inTransit, icon: Truck, color: "text-status-transit" },
    { label: "Received", value: received, icon: CheckCircle2, color: "text-status-received" },
    { label: "Warnings", value: warnings, icon: AlertTriangle, color: "text-status-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSuperAdmin ? (
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Super Admin — All agency traffic</span>
            ) : (
              <>Overview for <strong>{agencyName}</strong></>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  {loading ? <Skeleton className="h-9 w-16 mt-1" /> : <p className="text-3xl font-bold mt-1">{m.value}</p>}
                </div>
                <m.icon className={`h-8 w-8 ${m.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isSuperAdmin ? (
        <DocumentTable documents={documents} loading={loading} emptyMessage="No documents in the system yet." />
      ) : (
        <Tabs defaultValue="incoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="incoming">
              📥 Incoming Expected
              {!loading && incoming.filter(d => d.status === "In Transit").length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{incoming.filter(d => d.status === "In Transit").length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing">📤 Outgoing</TabsTrigger>
          </TabsList>
          <TabsContent value="incoming">
            <DocumentTable documents={incoming} loading={loading} emptyMessage="No incoming documents expected." />
          </TabsContent>
          <TabsContent value="outgoing">
            <DocumentTable documents={outgoing} loading={loading} emptyMessage="No outgoing documents sent." />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
