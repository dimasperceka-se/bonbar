import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-primary/10 text-primary p-4 rounded-full mb-6">
        <Package className="h-12 w-12" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Halaman Tidak Ditemukan</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Maaf, halaman yang Anda cari tidak tersedia atau Anda tidak memiliki akses ke halaman ini.
      </p>
      <Button asChild size="lg">
        <Link href="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  );
}
