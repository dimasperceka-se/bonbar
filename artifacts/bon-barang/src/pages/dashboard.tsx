import { useGetDashboardSummary, useGetDashboardTopItems, useGetDashboardRecentRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, FileText } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: topItems } = useGetDashboardTopItems();
  const { data: recentRequests } = useGetDashboardRecentRequests();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Ringkasan aktivitas bon barang Lapas.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permintaan Bulan Ini</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.thisMonthCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Permintaan baru pada bulan berjalan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permintaan</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalRequests ?? 0}</div>
            <p className="text-xs text-muted-foreground">Seluruh riwayat permintaan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Barang Sering Diminta</CardTitle>
            <CardDescription>Berdasarkan kuantitas dan frekuensi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topItems?.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{item.itemName}</span>
                    <span className="text-xs text-muted-foreground">{item.requestCount} kali diminta</span>
                  </div>
                  <div className="font-medium">{item.totalQty}</div>
                </div>
              ))}
              {!topItems?.length && (
                <div className="text-sm text-muted-foreground text-center py-4">Belum ada data barang.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permintaan Terbaru</CardTitle>
            <CardDescription>Aktivitas bon barang terkini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRequests?.map((req) => (
                <Link key={req.id} href={`/requests/${req.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Dari: {req.requesterName}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(req.createdAt), "dd MMM yyyy HH:mm")} • {req.itemCount} barang
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {!recentRequests?.length && (
                <div className="text-sm text-muted-foreground text-center py-4">Belum ada permintaan.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
