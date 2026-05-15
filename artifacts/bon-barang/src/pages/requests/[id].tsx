import { useParams, Link } from "wouter";
import { useGetRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { useRef, useState } from "react";

export default function RequestDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const { data: request, isLoading } = useGetRequest(id);

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

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);

    try {
      const element = pdfRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (doc) => {
          // html2canvas cannot parse oklch() (Tailwind v4 default). Inject
          // a hard reset so the cloned tree only contains rgb/hex colors.
          const style = doc.createElement("style");
          style.textContent = `
            .pdf-export-font, .pdf-export-font * {
              color: rgb(0, 0, 0) !important;
              border-color: rgb(0, 0, 0) !important;
              text-shadow: none !important;
              box-shadow: none !important;
            }
            .pdf-export-font { background-color: rgb(255, 255, 255) !important; }
            .pdf-export-font .bg-white { background-color: rgb(255, 255, 255) !important; }
            .pdf-export-font .bg-gray-100 { background-color: rgb(243, 244, 246) !important; }
          `;
          doc.head.appendChild(style);
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgAspect = canvas.height / canvas.width;
      const imgHeightOnPage = pdfWidth * imgAspect;

      if (imgHeightOnPage <= pdfHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeightOnPage);
      } else {
        let yOffset = 0;
        let remaining = canvas.height;
        while (remaining > 0) {
          const sliceHeight = Math.min(
            Math.round((pdfHeight / pdfWidth) * canvas.width),
            remaining
          );
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(sliceData, "JPEG", 0, 0, pdfWidth, (sliceHeight * pdfWidth) / canvas.width);
          yOffset += sliceHeight;
          remaining -= sliceHeight;
        }
      }

      pdf.save(`Bon_Barang_${request.id.toString().padStart(4, "0")}.pdf`);
    } catch (err) {
      toast({ title: "Gagal Export PDF", description: String(err), variant: "destructive" });
      console.error("PDF export error:", err);
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
            <h2 className="text-2xl font-bold tracking-tight">Detail Permintaan #{request.id.toString().padStart(4, '0')}</h2>
            <p className="text-muted-foreground">Diajukan pada {format(new Date(request.createdAt), "dd MMM yyyy HH:mm")}</p>
          </div>
        </div>

        <div className="flex gap-2">
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

        </div>
      </div>

      {/* Off-screen PDF Template — must not use display:none or html2canvas gets 0×0 */}
      {(() => {
        const isAdministrator = request.requesterName?.toLowerCase() === "administrator";
        const peminta = isAdministrator ? "" : request.requesterName;
        return (
      <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none", zIndex: -1 }}>
        <div ref={pdfRef} className="pdf-export-font p-12 bg-white text-black w-[794px] min-h-[1123px] mx-auto box-border border">
          <div className="flex items-center border-b-2 border-black pb-4 mb-8 gap-4">
            <img
              src="/logo_instansi.png"
              alt="Logo Instansi"
              crossOrigin="anonymous"
              className="h-24 w-24 object-contain shrink-0"
            />
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold uppercase leading-snug">KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA</h1>
              <h2 className="text-lg font-bold uppercase leading-snug mt-1">DIREKTORAT JENDERAL PEMASYARAKATAN</h2>
              <h2 className="text-lg font-bold uppercase leading-snug mt-1">KANTOR WILAYAH JAWA BARAT</h2>
              <h3 className="text-2xl font-bold uppercase leading-snug mt-2">LEMBAGA PEMASYARAKATAN KELAS IIA KUNINGAN</h3>
              <p className="text-sm mt-2">Jl. Siliwangi No. 123, Kuningan, Jawa Barat</p>
            </div>
            <div className="h-24 w-24 shrink-0" aria-hidden="true" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold uppercase underline">BON BARANG</h2>
          </div>

          <div className="mb-6">
            <table className="w-full text-left">
              <tbody>
                <tr>
                  <td className="w-48 py-1">Nama Peminta</td>
                  <td className="w-4 py-1">:</td>
                  <td className="py-1 font-medium">{peminta}</td>
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
              <p className="font-bold underline">________________________</p>
              <p>NIP. .........................</p>
            </div>

            <div className="text-center w-64">
              <p>Kuningan, {format(new Date(request.createdAt), "dd MMMM yyyy")}</p>
              <p className="font-bold">Peminta</p>
              <div className="h-24"></div>
              <p className="font-bold underline">{peminta || "________________________"}</p>
              <p>NIP. .........................</p>
            </div>
          </div>
        </div>
      </div>
        );
      })()}

    </div>
  );
}
