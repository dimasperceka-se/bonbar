import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { UserCircle, Loader2 } from "lucide-react";
import { useUpdateProfile, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [section, setSection] = useState(user?.section ?? "");

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setSection(user?.section ?? "");
  }, [user?.fullName, user?.section]);

  const dirty =
    user !== null &&
    user !== undefined &&
    (fullName.trim() !== (user.fullName ?? "") || section.trim() !== (user.section ?? ""));

  const handleSave = () => {
    updateProfile.mutate(
      { data: { fullName: fullName.trim(), section: section.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Profil diperbarui" });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: () => {
          toast({
            title: "Gagal menyimpan profil",
            description: "Periksa koneksi Anda dan coba lagi.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pengaturan</h2>
        <p className="text-muted-foreground">Kelola profil dan preferensi aplikasi Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil Pengguna</CardTitle>
          <CardDescription>
            Nama dan bagian/seksi Anda muncul di setiap permintaan dan PDF Bon Barang.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-4 rounded-full">
              <UserCircle className="h-12 w-12" />
            </div>
            <div>
              <div className="font-bold text-lg">{user?.fullName}</div>
              <div className="text-muted-foreground capitalize">{user?.role}</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama Pengguna</Label>
              <Input value={user?.username ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="section">Bagian / Seksi</Label>
              <Input
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="Misal: Seksi Kamtib"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={!dirty || updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
