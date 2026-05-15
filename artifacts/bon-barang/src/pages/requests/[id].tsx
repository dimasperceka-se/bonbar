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

      {/*
       * Off-screen PDF Template. All styles inline so it does not depend on the
       * Tailwind utility CSS bundle (html2canvas-pro's cloned DOM sometimes
       * loses Tailwind utilities, which collapses the layout).
       */}
      {(() => {
        const isAdministrator = request.requesterName?.toLowerCase() === "administrator";
        const peminta = isAdministrator ? "" : request.requesterName;
        const cellBorder: React.CSSProperties = { border: "1px solid #000", padding: "8px" };
        const cellBorderCenter: React.CSSProperties = { ...cellBorder, textAlign: "center" };

        return (
          <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none", zIndex: -1 }}>
            <div
              ref={pdfRef}
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                color: "#000",
                background: "#fff",
                width: "794px",
                minHeight: "1123px",
                padding: "48px",
                boxSizing: "border-box",
                border: "1px solid #000",
              }}
            >
              {/* Header (KOP) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  borderBottom: "2px solid #000",
                  paddingBottom: "16px",
                  marginBottom: "32px",
                }}
              >
                <img
                  src="/logo_instansi.png"
                  alt="Logo Instansi"
                  crossOrigin="anonymous"
                  style={{
                    width: "96px",
                    height: "96px",
                    objectFit: "contain",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, textAlign: "center" }}>
                  <h1 style={{ fontSize: "20px", fontWeight: 700, textTransform: "uppercase", lineHeight: 1.35, margin: 0 }}>
                    KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA
                  </h1>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, textTransform: "uppercase", lineHeight: 1.35, margin: "4px 0 0" }}>
                    DIREKTORAT JENDERAL PEMASYARAKATAN
                  </h2>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, textTransform: "uppercase", lineHeight: 1.35, margin: "4px 0 0" }}>
                    KANTOR WILAYAH JAWA BARAT
                  </h2>
                  <h3 style={{ fontSize: "22px", fontWeight: 700, textTransform: "uppercase", lineHeight: 1.35, margin: "8px 0 0" }}>
                    LEMBAGA PEMASYARAKATAN KELAS IIA KUNINGAN
                  </h3>
                  <p style={{ fontSize: "13px", margin: "8px 0 0" }}>
                    Jl. Siliwangi No. 123, Kuningan, Jawa Barat
                  </p>
                </div>
                <div style={{ width: "96px", height: "96px", flexShrink: 0 }} aria-hidden="true" />
              </div>

              {/* Title */}
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, textTransform: "uppercase", textDecoration: "underline", margin: 0 }}>
                  BON BARANG
                </h2>
              </div>

              {/* Meta info */}
              <div style={{ marginBottom: "24px" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "192px", padding: "4px 0" }}>Nama Peminta</td>
                      <td style={{ width: "16px", padding: "4px 0" }}>:</td>
                      <td style={{ padding: "4px 0", fontWeight: 500 }}>{peminta}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 0" }}>Bagian/Ruangan</td>
                      <td style={{ padding: "4px 0" }}>:</td>
                      <td style={{ padding: "4px 0" }}>{request.location}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 0" }}>Tanggal Dibutuhkan</td>
                      <td style={{ padding: "4px 0" }}>:</td>
                      <td style={{ padding: "4px 0" }}>{format(new Date(request.requestDate), "dd MMMM yyyy")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Items table */}
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginBottom: "48px" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ ...cellBorderCenter, width: "48px", fontWeight: 700 }}>NO</th>
                    <th style={{ ...cellBorderCenter, fontWeight: 700 }}>NAMA BARANG</th>
                    <th style={{ ...cellBorderCenter, width: "128px", fontWeight: 700 }}>BANYAKNYA</th>
                    <th style={{ ...cellBorderCenter, fontWeight: 700 }}>KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={cellBorderCenter}>{idx + 1}</td>
                      <td style={cellBorder}>{item.itemName}</td>
                      <td style={cellBorderCenter}>{item.quantity} {item.unit}</td>
                      <td style={cellBorder}>{item.purpose}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 10 - request.items.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} style={{ height: "32px" }}>
                      <td style={cellBorder}></td>
                      <td style={cellBorder}></td>
                      <td style={cellBorder}></td>
                      <td style={cellBorder}></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signature blocks */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "48px", padding: "0 32px" }}>
                <div style={{ textAlign: "center", width: "256px" }}>
                  <p style={{ margin: 0 }}>Mengetahui,</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>Kepala Lapas</p>
                  <div style={{ height: "96px" }}></div>
                  <p style={{ margin: 0, fontWeight: 700, textDecoration: "underline" }}>________________________</p>
                  <p style={{ margin: 0 }}>NIP. .........................</p>
                </div>

                <div style={{ textAlign: "center", width: "256px" }}>
                  <p style={{ margin: 0 }}>Kuningan, {format(new Date(request.createdAt), "dd MMMM yyyy")}</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>Peminta</p>
                  <div style={{ height: "96px" }}></div>
                  <p style={{ margin: 0, fontWeight: 700, textDecoration: "underline" }}>{peminta || "________________________"}</p>
                  <p style={{ margin: 0 }}>NIP. .........................</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
