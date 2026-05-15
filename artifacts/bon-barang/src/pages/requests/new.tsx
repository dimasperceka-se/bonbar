import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateRequest, useParseRequest } from "@workspace/api-client-react";
import type { RequestItemInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Sparkles, Trash2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function NewRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [naturalText, setNaturalText] = useState("");
  const [location, setLocationField] = useState("");
  const [requestDate, setRequestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [items, setItems] = useState<RequestItemInput[]>([]);
  
  const parseMutation = useParseRequest();
  const createMutation = useCreateRequest();

  const handleParse = () => {
    if (!naturalText.trim()) return;
    
    parseMutation.mutate(
      { data: { text: naturalText } },
      {
        onSuccess: (data) => {
          const newItems = data.items.map(item => ({
            itemNo: item.no,
            itemName: item.name,
            quantity: item.qty.replace(/[^0-9]/g, '') || "1",
            unit: item.qty.replace(/[0-9\s]/g, '') || "buah",
            purpose: item.purpose,
          }));
          
          setItems(newItems);
          toast({
            title: "Teks berhasil diproses",
            description: `Ditemukan ${newItems.length} barang dari deskripsi Anda.`,
          });
        },
        onError: () => {
          toast({
            title: "Gagal memproses teks",
            description: "Coba tuliskan deskripsi dengan lebih jelas.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemNo: items.length + 1,
        itemName: "",
        quantity: "1",
        unit: "buah",
        purpose: "",
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    // Re-number
    setItems(newItems.map((item, i) => ({ ...item, itemNo: i + 1 })));
  };

  const handleItemChange = (index: number, field: keyof RequestItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!location.trim() || items.length === 0) {
      toast({
        title: "Data tidak lengkap",
        description: "Pastikan Ruangan/Bagian terisi dan ada minimal 1 barang.",
        variant: "destructive"
      });
      return;
    }

    createMutation.mutate(
      {
        data: {
          location,
          requestDate: new Date(requestDate).toISOString(),
          items
        }
      },
      {
        onSuccess: (req) => {
          toast({
            title: "Bon Barang Dibuat",
            description: "Permintaan Anda telah diajukan dan menunggu persetujuan.",
          });
          setLocation(`/requests/${req.id}`);
        },
        onError: () => {
          toast({
            title: "Gagal membuat bon",
            description: "Terjadi kesalahan saat menyimpan data.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/requests"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Buat Permintaan Baru</h2>
          <p className="text-muted-foreground">Gunakan AI untuk mempercepat pengisian atau isi manual secara langsung.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Asisten AI
              </CardTitle>
              <CardDescription>Ceritakan apa yang Anda butuhkan, AI akan membuatkan tabel secara otomatis.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Contoh: Tolong siapkan 5 rim kertas A4 untuk bagian registrasi, 2 buah tinta printer hitam, dan 1 lusin pulpen biru."
                className="min-h-[150px] resize-none"
                value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleParse} 
                className="w-full" 
                disabled={!naturalText.trim() || parseMutation.isPending}
              >
                {parseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Buat Tabel Otomatis
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Pengajuan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Ruangan / Bagian</Label>
                <Input 
                  id="location" 
                  placeholder="Contoh: KPLP / Kepegawaian" 
                  value={location}
                  onChange={(e) => setLocationField(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal Dibutuhkan</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daftar Barang</CardTitle>
                <CardDescription>Rincian barang yang akan di-bon</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Baris
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead className="w-24">Jumlah</TableHead>
                      <TableHead className="w-28">Satuan</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada barang ditambahkan. Gunakan Asisten AI atau tambah manual.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-center font-medium">{item.itemNo}</TableCell>
                          <TableCell>
                            <Input 
                              value={item.itemName} 
                              onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                              placeholder="Nama barang..."
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              min="1"
                              value={item.quantity} 
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              className="h-8 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              value={item.unit} 
                              onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                              placeholder="rim/buah..."
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              value={item.purpose} 
                              onChange={(e) => handleItemChange(index, "purpose", e.target.value)}
                              placeholder="Tujuan..."
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 flex justify-between bg-muted/20">
              <div className="text-sm text-muted-foreground">
                Total: <strong>{items.length}</strong> jenis barang
              </div>
              <Button 
                onClick={handleSubmit} 
                disabled={items.length === 0 || !location.trim() || createMutation.isPending}
                size="lg"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Ajukan Bon Barang
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
