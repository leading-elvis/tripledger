import React from "react";
import { createRoot } from "react-dom/client";
import LedgerApp from "../app/ledger-app";
import "../app/globals.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><LedgerApp/></React.StrictMode>);
