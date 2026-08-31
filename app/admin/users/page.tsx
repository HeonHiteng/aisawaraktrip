import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { adminListUsers } from "@/lib/domain/admin";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const users = await adminListUsers();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {u.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Demo personas. Real user management (search, roles, suspend) comes with
        the Supabase Auth admin API.
      </p>
    </div>
  );
}
