import { useParams, Link } from "wouter";
import { useGetRequest, useApproveRequest, useRejectRequest, useFulfillRequest } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowLeft, Check, X, PackageCheck, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetRequestQueryKey, getListRequestsQueryKey } from "@workspace/api-client-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef, useState } from "react";

export default function RequestDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const { data: request, isLoading } = useGetRequest(id);
  
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const fulfillMutation = useFulfillRequest();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Permintaan tidak ditemukan</h3>
        <p className="text-muted-foreground mt-2">Data bon barang yang Anda cari tidak ada atau Anda tidak memiliki akses.</p>
        <Button asChild className="mt-4">
          <Link href="/requests">Kembali ke Daftar</Link>
        </Button>
      </div>
    );
  }

  const isKalapas = user?.role === "kalapas" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const handleApprove = () => {
    approveMutation.mutate(
      { id, data: { notes: "Disetujui" } },
      {
        onSuccess: () => {
          toast({ title: "Bon Disetujui" });
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
        }
      }
    );
  };

  const handleReject = () => {
    rejectMutation.mutate(
      { id, data: { notes: "Ditolak" } },
      {
        onSuccess: () => {
          toast({ title: "Bon Ditolak", variant: "destructive" });
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
        }
      }
    );
  };

  const handleFulfill = () => {
    fulfillMutation.mutate(
      { id, data: undefined },
      {
        onSuccess: () => {
          toast({ title: "Bon Selesai", description: "Barang telah diserahkan." });
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
        }
      }
    );
  };

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);
    
    try {
      const element = pdfRef.current;
      element.style.display = "block"; // Make visible temporarily if it was hidden
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Bon_Barang_${request.id.toString().padStart(4, '0')}.pdf`);
      
      element.style.display = "none";
    } catch (err) {
      toast({ title: "Gagal Export PDF", variant: "destructive" });
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/requests"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Detail Permintaan #{request.id.toString().padStart(4, '0')}</h2>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-muted-foreground">Diajukan pada {format(new Date(request.createdAt), "dd MMM yyyy HH:mm")}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {request.status === "pending" && isKalapas && (
            <>
              <Button 
                variant="outline" 
                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" /> Setujui
              </Button>
              <Button 
                variant="outline"
                className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Tolak
              </Button>
            </>
          )}
          
          {request.status === "approved" && isAdmin && (
            <Button onClick={handleFulfill} disabled={fulfillMutation.isPending}>
              <PackageCheck className="h-4 w-4 mr-2" /> Tandai Selesai
            </Button>
          )}

          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Daftar Barang</CardTitle>
            <CardDescription>Rincian barang yang diminta untuk {request.location}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                    <TableCell className="text-muted-foreground">{item.purpose}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Peminta</div>
                <div className="font-medium">{request.requesterName}</div>
                <div className="text-sm text-muted-foreground">{request.requesterSection}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tujuan Ruangan/Bagian</div>
                <div className="font-medium">{request.location}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tanggal Dibutuhkan</div>
                <div className="font-medium">{format(new Date(request.requestDate), "dd MMM yyyy")}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Persetujuan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.approvalHistory.map((history, i) => (
                  <div key={history.id} className="relative pl-6 pb-4 last:pb-0">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary" />
                    {i !== request.approvalHistory.length - 1 && (
                      <div className="absolute left-[3px] top-3.5 bottom-0 w-[2px] bg-border" />
                    )}
                    <div className="text-sm font-medium">{history.action}</div>
                    <div className="text-xs text-muted-foreground">Oleh: {history.actorName}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(history.timestamp), "dd MMM yyyy HH:mm")}</div>
                    {history.notes && (
                      <div className="text-sm mt-1 p-2 bg-muted rounded-md italic">"{history.notes}"</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden PDF Template */}
      <div style={{ display: 'none' }}>
        <div ref={pdfRef} className="pdf-export-font p-12 bg-white text-black w-[210mm] min-h-[297mm] mx-auto box-border border">
          <div className="text-center border-b-2 border-black pb-4 mb-8">
            <h1 className="text-xl font-bold uppercase m-0 leading-tight">KEMENTERIAN HUKUM DAN HAK ASASI MANUSIA R.I.</h1>
            <h2 className="text-lg font-bold uppercase m-0 leading-tight">KANTOR WILAYAH JAWA BARAT</h2>
            <h3 className="text-2xl font-bold uppercase m-0 mt-1">LEMBAGA PEMASYARAKATAN KELAS IIA KUNINGAN</h3>
            <p className="text-sm mt-2">Jl. Siliwangi No. 123, Kuningan, Jawa Barat</p>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold uppercase underline">BON BARANG</h2>
            <p className="mt-1">Nomor: {request.id.toString().padStart(4, '0')}/BB/LapasKng/{format(new Date(request.createdAt), "yyyy")}</p>
          </div>

          <div className="mb-6">
            <table className="w-full text-left">
              <tbody>
                <tr>
                  <td className="w-48 py-1">Nama Peminta</td>
                  <td className="w-4 py-1">:</td>
                  <td className="py-1 font-medium">{request.requesterName}</td>
                </tr>
                <tr>
                  <td className="py-1">Bagian/Ruangan</td>
                  <td className="py-1">:</td>
                  <td className="py-1">{request.location}</td>
                </tr>
                <tr>
                  <td className="py-1">Tanggal Dibutuhkan</td>
                  <td className="py-1">:</td>
                  <td className="py-1">{format(new Date(request.requestDate), "dd MMMM yyyy")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <table className="w-full border-collapse border border-black mb-12">
            <thead>
              <tr className="bg-gray-100 border border-black">
                <th className="border border-black p-2 text-center w-12 font-bold">NO</th>
                <th className="border border-black p-2 text-center font-bold">NAMA BARANG</th>
                <th className="border border-black p-2 text-center w-32 font-bold">BANYAKNYA</th>
                <th className="border border-black p-2 text-center font-bold">KETERANGAN</th>
              </tr>
            </thead >
            <tbody>
              {request.items.map((item, idx) => (
                <tr key={item.id} className="border border-black">
                  <td className="border border-black p-2 text-center">{idx + 1}</td>
                  <td className="border border-black p-2">{item.itemName}</td>
                  <td className="border border-black p-2 text-center">{item.quantity} {item.unit}</td>
                  <td className="border border-black p-2">{item.purpose}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 10 - request.items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border border-black h-8">
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between mt-12 px-8">
            <div className="text-center w-64">
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala Lapas</p>
              <div className="h-24"></div>
              <p className="font-bold underline">{request.approvedByName || "________________________"}</p>
              <p>NIP. .........................</p>
            </div>
            
            <div className="text-center w-64">
              <p>Kuningan, {format(new Date(request.createdAt), "dd MMMM yyyy")}</p>
              <p className="font-bold">Peminta</p>
              <div className="h-24"></div>
              <p className="font-bold underline">{request.requesterName}</p>
              <p>NIP. .........................</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
