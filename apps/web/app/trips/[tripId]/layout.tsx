"use client";

import { usePathname } from "next/navigation";
import LedgerApp from "../../ledger-app";
import { parseRoute } from "@/lib/navigation.mjs";

// The ledger lives above [section], so the same client instance (and its
// unsaved drafts) survives the router's back/forward restoration.
export default function TripLayout({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  return <><LedgerApp route={parseRoute(pathname)}/>{children}</>;
}
