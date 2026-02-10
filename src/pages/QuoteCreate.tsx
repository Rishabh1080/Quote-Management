import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QuoteForm from "@/components/QuoteForm";
import { toast } from "sonner";

const QuoteCreate = () => {
  const navigate = useNavigate();
  const [showDiscard, setShowDiscard] = useState(false);

  return (
    <div className="container py-4">
      <QuoteForm
        renderActions={(saving, saveQuote) => (
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Create New Quote</h4>
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

export default QuoteCreate;
