import QuoteForm from "@/components/QuoteForm";
import { toast } from "sonner";

const QuoteCreate = () => {
  return (
    <div className="container py-4">
      <QuoteForm
        renderActions={(saving, saveQuote) => (
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Create New Quote</h4>
            <div className="d-flex gap-2">
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
    </div>
  );
};

export default QuoteCreate;
