import { useState } from "react";
import { Link } from "wouter";
import { useListRequests } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import type { ListRequestsStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import { Plus, Search, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RequestsList() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ListRequestsStatus | "all">("all");
  
  const { data: requests, isLoading } = useListRequests(
    { 
      status: statusFilter === "all" ? undefined : statusFilter,
      requesterId: user?.role === "requester" ? user.id : undefined 
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Permintaan Bon Barang</h2>
          <p className="text-muted-foreground">
            {user?.role === "requester" 
              ? "Daftar permintaan bon barang yang telah Anda ajukan." 
              : "Seluruh daftar permintaan bon barang di lapas."}
          </p>
        </div>
        <Button asChild>
          <Link href="/requests/new">
            <Plus className="h-4 w-4 mr-2" />
            Buat Permintaan
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle>Riwayat Permintaan</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari referensi..."
                  className="pl-8"
                  disabled // Placeholder since API doesn't support text search yet
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ListRequestsStatus | "all")}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="approved">Disetujui</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                  <SelectItem value="fulfilled">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">ID Bon</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Peminta</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : requests && requests.length > 0 ? (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">#{request.id.toString().padStart(4, '0')}</TableCell>
                      <TableCell>{format(new Date(request.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>{request.requesterName}</TableCell>
                      <TableCell>{request.location}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/requests/${request.id}`}>
                            <FileText className="h-4 w-4 mr-2" /> Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Tidak ada permintaan ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
