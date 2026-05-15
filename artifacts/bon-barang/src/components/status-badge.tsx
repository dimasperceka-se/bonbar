import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: "pending" | "approved" | "rejected" | "fulfilled" | string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-500 border-yellow-200 dark:border-yellow-900">Menunggu</Badge>;
    case "approved":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-500 border-blue-200 dark:border-blue-900">Disetujui</Badge>;
    case "rejected":
      return <Badge variant="destructive">Ditolak</Badge>;
    case "fulfilled":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-500 border-green-200 dark:border-green-900">Selesai</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
