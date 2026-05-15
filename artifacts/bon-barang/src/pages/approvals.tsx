import { useListRequests, useApproveRequest, useRejectRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import { Check, X, Search, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListRequestsQueryKey } from "@workspace/api-client-react";

export default function Approvals() {
  const { data: requests, isLoading } = useListRequests({ status: "pending" });
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleApprove = (id: number) => {
    approveMutation.mutate(
      { id, data: { notes: "Disetujui oleh Kalapas" } },
      {
        onSuccess: () => {
          toast({ title: "Bon Disetujui" });
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey({ status: "pending" }) });
        }
      }
    );
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate(
      { id, data: { notes: "Ditolak" } },
      {
        onSuccess: () => {
          toast({ title: "Bon Ditolak", variant: "destructive" });
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey({ status: "pending" }) });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Antrean Persetujuan</h2>
        <p className="text-muted-foreground">
          Daftar bon barang yang menunggu persetujuan Kalapas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menunggu Keputusan</CardTitle>
          <CardDescription>Segera tindak lanjuti permintaan di bawah ini.</CardDescription>
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">Memuat data...</TableCell>
                  </TableRow>
                ) : requests && requests.length > 0 ? (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <Link href={`/requests/${request.id}`} className="hover:underline text-primary">
                          #{request.id.toString().padStart(4, '0')}
                        </Link>
                      </TableCell>
                      <TableCell>{format(new Date(request.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>{request.requesterName}</TableCell>
                      <TableCell>{request.location}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-500"
                          onClick={() => handleApprove(request.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" /> Setujui
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-500"
                          onClick={() => handleReject(request.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" /> Tolak
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      Tidak ada antrean persetujuan.
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
