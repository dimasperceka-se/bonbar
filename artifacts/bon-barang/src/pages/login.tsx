import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          setLocation("/");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="bg-primary text-primary-foreground p-3 rounded-xl mb-4">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sistem Informasi Bon Barang</h1>
        <p className="text-muted-foreground">Lembaga Pemasyarakatan Kelas IIA</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>
            Gunakan kredensial yang diberikan oleh administrator.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nama Pengguna</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loginMutation.isPending}
                placeholder="Masukkan nama pengguna..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginMutation.isPending}
                placeholder="Masukkan kata sandi..."
              />
            </div>
            {loginMutation.isError && (
              <p className="text-sm text-destructive">
                Gagal masuk. Periksa nama pengguna dan kata sandi Anda.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="mt-8 text-center text-sm text-muted-foreground max-w-md">
        <p className="mb-2">Demo Accounts:</p>
        <div className="grid grid-cols-3 gap-4">
          <div><strong className="block">Admin</strong>admin / admin123</div>
          <div><strong className="block">Kalapas</strong>kalapas / kalapas123</div>
          <div><strong className="block">Peminta</strong>user / user123</div>
        </div>
      </div>
    </div>
  );
}
