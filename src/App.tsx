import { useState, useCallback } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import QuotesList from "@/pages/QuotesList";
import QuoteCreate from "@/pages/QuoteCreate";
import QuoteDetails from "@/pages/QuoteDetails";
import QuoteNewVersion from "@/pages/QuoteNewVersion";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const App = () => {
  const [detailsStatus, setDetailsStatus] = useState<string | null>(null);
  const [detailsQuoteId, setDetailsQuoteId] = useState<string | null>(null);

  const handleQuoteLoaded = useCallback((status: string | null, quoteId: string | null) => {
    setDetailsStatus(status);
    setDetailsQuoteId(quoteId);
  }, []);

  const handleApprove = async () => {
    if (!detailsQuoteId || detailsStatus !== "PENDING_APPROVAL") return;
    await supabase.from("quotes").update({ status_code: "APPROVED" }).eq("id", detailsQuoteId);
    toast.success("Quote approved!");
    setDetailsStatus("APPROVED");
    window.location.reload();
  };

  const handleReject = async () => {
    if (!detailsQuoteId || detailsStatus !== "PENDING_APPROVAL") return;
    await supabase.from("quotes").update({ status_code: "REJECTED" }).eq("id", detailsQuoteId);
    toast.success("Quote rejected");
    setDetailsStatus("REJECTED");
    window.location.reload();
  };

  return (
    <>
      <Sonner />
      <BrowserRouter>
        <AppNavbar quoteStatus={detailsStatus} onApprove={handleApprove} onReject={handleReject} />
        <Routes>
          <Route path="/" element={<Navigate to="/quotes" replace />} />
          <Route path="/quotes" element={<QuotesList />} />
          <Route path="/quotes/new" element={<QuoteCreate />} />
          <Route path="/quotes/:id" element={<QuoteDetails onQuoteLoaded={handleQuoteLoaded} />} />
          <Route path="/quotes/:id/new-version" element={<QuoteNewVersion />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
