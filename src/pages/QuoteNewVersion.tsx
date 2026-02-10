import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import QuoteForm from "@/components/QuoteForm";
import { toast } from "sonner";

const QuoteNewVersion = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [prefill, setPrefill] = useState<any>(null);
  const [groupId, setGroupId] = useState<string>("");
  const [showDiscard, setShowDiscard] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: q } = await supabase
        .from("quotes")
        .select("*, quote_line_items(*)")
        .eq("id", id)
        .single();

      if (!q) {
        setLoading(false);
        return;
      }

      if (q.status_code === "APPROVED") {
        setBlocked(true);
        setLoading(false);
        return;
      }

      setGroupId(q.quote_group_id);
      
      // Fetch the first version (version_number = 0) to get the default costs
      const { data: firstVersion } = await supabase
        .from("quotes")
        .select("*, quote_line_items(*)")
        .eq("quote_group_id", q.quote_group_id)
        .eq("version_number", 0)
        .single();

      // Extract cost defaults from first version's quote record, fallback to current quote
      const costDefaults: Record<string, string> = {};
      const sourceQuote = firstVersion || q;
      
      if (sourceQuote.man_days_cost) {
        costDefaults['MAN_DAYS'] = String(sourceQuote.man_days_cost);
      }
      if (sourceQuote.stay_man_days_cost) {
        costDefaults['STAY_MAN_DAYS'] = String(sourceQuote.stay_man_days_cost);
      }
      if (sourceQuote.fixed_cost) {
        costDefaults['FIXED'] = String(sourceQuote.fixed_cost);
      }

      const additionalItems = (q.quote_line_items || [])
        .filter((li: any) => li.item_type !== "PRODUCT_BASE")
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((li: any) => ({
          code: li.item_type,
          label: li.label,
          description: li.description || "",
          quantity: li.quantity,
          unit_price: Number(li.unit_price),
        }));

      setPrefill({
        company_id: q.company_id,
        product_id: q.product_id,
        discount_percent: q.discount_percent,
        additionalItems,
        costDefaults,
      });
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="container py-4"><p>Loading...</p></div>;
  if (blocked) return (
    <div className="container py-4">
      <div className="alert alert-warning">
        This quote version is <strong>Approved</strong> and cannot be used to create a new version.
      </div>
    </div>
  );
  if (!prefill) return <div className="container py-4"><p>Quote not found.</p></div>;

  return (
    <div className="container py-4">
      <QuoteForm
        prefill={prefill}
        quoteGroupId={groupId}
        sourceQuoteId={id}
        renderActions={(saving, saveQuote) => (
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Create New Version</h4>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowDiscard(true)}>
                ← Back
              </button>
              <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => saveQuote("DRAFT")}>
                Save as Draft
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => saveQuote("PENDING_APPROVAL")}>
                Submit for Approval
              </button>
              <button className="btn btn-outline-dark btn-sm" disabled onClick={() => toast.info("Coming soon")}>
                Export as PDF
              </button>
            </div>
          </div>
        )}
      />

      {showDiscard && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Discard changes?</h5>
                <button type="button" className="btn-close" onClick={() => setShowDiscard(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">Are you sure you want to go back? This will lose all the information you've filled.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowDiscard(false)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={() => navigate("/quotes")}>Yes, discard</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteNewVersion;
