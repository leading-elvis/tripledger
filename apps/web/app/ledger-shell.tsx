"use client";

import { usePathname } from "next/navigation";
import { parseRoute } from "@/lib/navigation.mjs";
import LedgerApp from "./ledger-app";

// Keep one client ledger mounted while home, trips and their sections change.
export default function LedgerShell() {
  const pathname=usePathname();
  return <LedgerApp route={parseRoute(pathname??"/")}/>;
}
