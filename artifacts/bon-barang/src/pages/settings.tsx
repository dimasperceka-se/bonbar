import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { UserCircle } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pengaturan</h2>
        <p className="text-muted-foreground">Kelola profil dan preferensi aplikasi Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil Pengguna</CardTitle>
          <CardDescription>Informasi akun Anda di sistem Bon Barang.</CardDescription>
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
              <Input value={user?.username} disabled />
            </div>
            <div className="space-y-2">
              <Label>Bagian/Seksi</Label>
              <Input value={user?.section} disabled />
            </div>
          </div>

          <div className="pt-4">
            <Button disabled>Simpan Perubahan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
