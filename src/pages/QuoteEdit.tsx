import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import QuoteForm from "@/components/QuoteForm";
import { toast } from "sonner";

const QuoteEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState<any>(null);
  const [blocked, setBlocked] = useState(false);
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

      // Only allow editing if status is DRAFT
      if (q.status_code !== "DRAFT") {
        setBlocked(true);
        setLoading(false);
        return;
      }

      // Prepare cost defaults
      const costDefaults: Record<string, string> = {};
      if (q.man_days_cost) {
        costDefaults['MAN_DAYS'] = String(q.man_days_cost);
      }
      if (q.stay_man_days_cost) {
        costDefaults['STAY_MAN_DAYS'] = String(q.stay_man_days_cost);
      }
      if (q.fixed_cost) {
        costDefaults['FIXED'] = String(q.fixed_cost);
      }

      // Prepare additional items from line items (exclude PRODUCT_BASE)
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
        remarks: q.remarks || "",
        notes: q.notes || "",
      });
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="container py-4"><p>Loading...</p></div>;
  
  if (blocked) return (
    <div className="container py-4">
      <div className="alert alert-warning">
        This quote is not a draft and cannot be edited. Only draft quotes can be edited.
      </div>
    </div>
  );
  
  if (!prefill) return <div className="container py-4"><p>Quote not found.</p></div>;

  return (
    <div className="container py-4">
      <QuoteForm
        prefill={prefill}
        existingQuoteId={id}
        renderActions={(saving, saveQuote) => (
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Edit Draft Quote</h4>
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
                <p className="mb-0">Are you sure you want to go back? Any unsaved changes will be lost.</p>
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

export default QuoteEdit;
