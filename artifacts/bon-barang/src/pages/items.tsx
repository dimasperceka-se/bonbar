import { useListItems, useCreateItem, useUpdateItem, useDeleteItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListItemsQueryKey } from "@workspace/api-client-react";

export default function Items() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: items, isLoading } = useListItems({ 
    category: categoryFilter === "all" ? undefined : categoryFilter,
    q: searchQuery || undefined
  });

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    defaultUnit: "buah",
    category: "atk",
    currentStock: 0
  });

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        defaultUnit: item.defaultUnit,
        category: item.category,
        currentStock: item.currentStock || 0
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", defaultUnit: "buah", category: "atk", currentStock: 0 });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateItem.mutate(
        { id: editingId, data: formData },
        {
          onSuccess: () => {
            toast({ title: "Barang diperbarui" });
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          }
        }
      );
    } else {
      createItem.mutate(
        { data: formData },
        {
          onSuccess: () => {
            toast({ title: "Barang ditambahkan" });
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus barang ini?")) {
      deleteItem.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Barang dihapus" });
            queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          }
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Master Barang</h2>
          <p className="text-muted-foreground">Kelola daftar referensi barang standar lapas.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Barang
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama barang..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="atk">ATK</SelectItem>
                <SelectItem value="kebersihan">Kebersihan</SelectItem>
                <SelectItem value="konsumsi">Konsumsi</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Stok Saat Ini</TableHead>
                  {isAdmin && <TableHead className="w-[100px] text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">Memuat data...</TableCell></TableRow>
                ) : items && items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="uppercase text-xs">{item.category}</TableCell>
                      <TableCell>{item.defaultUnit}</TableCell>
                      <TableCell className="text-right">{item.currentStock || 0}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Tidak ada barang ditemukan.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Barang</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atk">ATK</SelectItem>
                    <SelectItem value="kebersihan">Kebersihan</SelectItem>
                    <SelectItem value="konsumsi">Konsumsi</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satuan Default</Label>
                <Input value={formData.defaultUnit} onChange={(e) => setFormData({ ...formData, defaultUnit: e.target.value })} placeholder="rim/buah/dus" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stok Awal</Label>
              <Input type="number" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createItem.isPending || updateItem.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
