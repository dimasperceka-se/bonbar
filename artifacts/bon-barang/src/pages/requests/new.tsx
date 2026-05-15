import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useCreateRequest, useParseRequest, useListItems } from "@workspace/api-client-react";
import type { RequestItemInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Sparkles, Trash2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

function findItemByName<T extends { name: string }>(items: T[] | undefined, name: string): T | undefined {
  if (!items || !name) return undefined;
  const normalized = name.trim().toLowerCase();
  return items.find((it) => it.name.toLowerCase() === normalized)
    ?? items.find((it) => it.name.toLowerCase().includes(normalized) || normalized.includes(it.name.toLowerCase()));
}

export default function NewRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [naturalText, setNaturalText] = useState("");
  const [location, setLocationField] = useState("");
  const [requestDate, setRequestDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [items, setItems] = useState<RequestItemInput[]>([]);

  const { data: masterItems, isLoading: itemsLoading } = useListItems({});
  const itemByName = useMemo(() => {
    const map = new Map<string, { id: number; name: string; defaultUnit: string }>();
    masterItems?.forEach((it) => map.set(it.name, it));
    return map;
  }, [masterItems]);

  const parseMutation = useParseRequest();
  const createMutation = useCreateRequest();

  const handleParse = () => {
    if (!naturalText.trim()) return;

    parseMutation.mutate(
      { data: { text: naturalText } },
      {
        onSuccess: (data) => {
          let unmatchedCount = 0;
          const newItems = data.items.map((item) => {
            const matched = findItemByName(masterItems, item.name);
            if (!matched) unmatchedCount += 1;
            return {
              itemNo: item.no,
              itemName: matched?.name ?? "",
              quantity: item.qty.replace(/[^0-9]/g, "") || "1",
              unit: matched?.defaultUnit ?? (item.qty.replace(/[0-9\s]/g, "") || "buah"),
              purpose: item.purpose,
            };
          });

          setItems(newItems);

          if (unmatchedCount > 0) {
            toast({
              title: `Ditemukan ${newItems.length} barang`,
              description: `${unmatchedCount} barang tidak ada di Master Barang — silakan pilih manual atau tambahkan ke Master.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Teks berhasil diproses",
              description: `${newItems.length} barang berhasil dicocokkan dengan Master Barang.`,
            });
          }
        },
        onError: () => {
          toast({
            title: "Gagal memproses teks",
            description: "Coba tuliskan deskripsi dengan lebih jelas.",
            variant: "destructive",
          });
        },
      },
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
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems.map((item, i) => ({ ...item, itemNo: i + 1 })));
  };

  const handleItemChange = (index: number, field: keyof RequestItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSelectMasterItem = (index: number, name: string) => {
    const master = itemByName.get(name);
    if (!master) return;
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      itemName: master.name,
      unit: master.defaultUnit,
    };
    setItems(newItems);
  };

  const allItemsValid = items.length > 0 && items.every((item) => itemByName.has(item.itemName));

  const handleSubmit = () => {
    if (!location.trim() || items.length === 0) {
      toast({
        title: "Data tidak lengkap",
        description: "Pastikan Ruangan/Bagian terisi dan ada minimal 1 barang.",
        variant: "destructive",
      });
      return;
    }

    if (!allItemsValid) {
      toast({
        title: "Barang tidak valid",
        description: "Setiap baris harus memilih barang yang ada di Master Barang.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(
      {
        data: {
          location,
          requestDate: new Date(requestDate).toISOString(),
          items,
        },
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
        },
      },
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
          <p className="text-muted-foreground">Pilih barang dari Master Barang. Gunakan AI untuk pengisian otomatis.</p>
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
                <CardDescription>
                  Pilih barang dari Master Barang
                  {masterItems && ` (${masterItems.length} tersedia)`}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddItem} disabled={itemsLoading || !masterItems?.length}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Baris
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              {!itemsLoading && masterItems?.length === 0 && (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Master Barang masih kosong. Hubungi admin untuk menambahkan barang di menu <strong>Master Barang</strong> terlebih dahulu.
                </div>
              )}
              {(itemsLoading || (masterItems?.length ?? 0) > 0) && (
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
                        items.map((item, index) => {
                          const isUnknownItem = item.itemName !== "" && !itemByName.has(item.itemName);
                          return (
                            <TableRow key={index}>
                              <TableCell className="text-center font-medium">{item.itemNo}</TableCell>
                              <TableCell>
                                <Select
                                  value={itemByName.has(item.itemName) ? item.itemName : ""}
                                  onValueChange={(value) => handleSelectMasterItem(index, value)}
                                >
                                  <SelectTrigger
                                    className={`h-8 ${isUnknownItem ? "border-destructive text-destructive" : ""}`}
                                  >
                                    <SelectValue placeholder={isUnknownItem ? `${item.itemName} (tidak ada di Master)` : "Pilih barang..."} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {masterItems?.map((mi) => (
                                      <SelectItem key={mi.id} value={mi.name}>
                                        {mi.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t p-4 flex justify-between bg-muted/20">
              <div className="text-sm text-muted-foreground">
                Total: <strong>{items.length}</strong> jenis barang
              </div>
              <Button
                onClick={handleSubmit}
                disabled={items.length === 0 || !location.trim() || !allItemsValid || createMutation.isPending}
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
