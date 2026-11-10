import React from "react";
import JobPageLayout from "@/components/landing/JobPageLayout";
import { JOB_PAGES } from "@/lib/landing/jobPages";

export default function ClubPaymentsSoftware() {
  return <JobPageLayout page={JOB_PAGES["club-payments-stripe-quickbooks"]} />;
}