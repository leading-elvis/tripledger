import React from "react";
import { createRoot } from "react-dom/client";
import LedgerApp from "../app/ledger-app";
import { parseRoute } from "../lib/navigation.mjs";
import "../app/globals.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><LedgerApp route={parseRoute(window.location.pathname)}/></React.StrictMode>);
