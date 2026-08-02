import { redirect } from "next/navigation";

// Tenants land here after sign-in; send them straight to the new-ticket page.
export default function TenantIndex() {
  redirect("/tenant/new");
}
