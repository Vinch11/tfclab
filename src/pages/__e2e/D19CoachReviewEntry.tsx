/**
 * D1.9 isolated QA page entry. Only served by vite.d19.config.ts.
 * NOT imported by App.tsx and never bundled into the production route tree.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import D19CoachReviewHarness from "./D19CoachReviewHarness";
import "@/index.css";

const node=document.getElementById("root");
if(!node)throw new Error("D19_QA_ROOT_MISSING");
createRoot(node).render(
  <React.StrictMode>
    <D19CoachReviewHarness/>
  </React.StrictMode>,
);
