import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const statusBadge = (code: string) => {
  const cls: Record<string, string> = {
    DRAFT: "bg-secondary",
    PENDING_APPROVAL: "bg-warning text-dark",
    APPROVED: "bg-success",
    REJECTED: "bg-danger",
  };
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return <span className={`badge ${cls[code] || "bg-secondary"}`}>{labels[code] || code}</span>;
};

interface QuoteDetailsPageProps {
  onQuoteLoaded?: (status: string | null, quoteId: string | null) => void;
}

const QuoteDetails = ({ onQuoteLoaded }: QuoteDetailsPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: q } = await supabase
      .from("quotes")
      .select("*, companies(name), products(name, base_price)")
      .eq("id", id)
      .single();
    setQuote(q);
    onQuoteLoaded?.(q?.status_code || null, q?.id || null);

    if (q) {
      const { data: items } = await supabase
        .from("quote_line_items")
        .select("*")
        .eq("quote_id", q.id)
        .order("sort_order");
      setLineItems(items || []);

      const { data: vers } = await supabase
        .from("quotes")
        .select("id, version_label, status_code, net_total, updated_at")
        .eq("quote_group_id", q.quote_group_id)
        .order("version_number", { ascending: false });
      setVersions(vers || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    return () => onQuoteLoaded?.(null, null);
  }, [id]);

  const handleReject = async () => {
    if (quote.status_code !== "PENDING_APPROVAL") return;
    await supabase.from("quotes").update({ status_code: "REJECTED" }).eq("id", quote.id);
    toast.success("Quote rejected");
    load();
  };

  if (loading) return <div className="container py-4"><p>Loading...</p></div>;
  if (!quote) return <div className="container py-4"><p>Quote not found.</p></div>;

  const isApproved = quote.status_code === "APPROVED";

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h4 className="mb-1">{quote.companies?.name}</h4>
          <p className="text-muted mb-0">{quote.version_label} · {statusBadge(quote.status_code)}</p>
        </div>
        <Link to="/quotes" className="btn btn-outline-secondary btn-sm">← Back</Link>
      </div>

      {isApproved && (
        <div className="quote-readonly-notice mb-3">✓ This quote is approved and read-only.</div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card mb-3">
            <div className="card-body">
              <p><strong>Product:</strong> {quote.products?.name}</p>
              <p><strong>Discount:</strong> {quote.discount_percent}%</p>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-semibold">Line Items</div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Type</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id}>
                      <td>{li.label}</td>
                      <td><small className="text-muted">{li.item_type}</small></td>
                      <td className="text-end">{li.quantity}</td>
                      <td className="text-end">{fmt(li.unit_price)}</td>
                      <td className="text-end">{fmt(li.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="text-end fw-semibold">Subtotal</td>
                    <td className="text-end fw-semibold">{fmt(quote.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="text-end">Discount ({quote.discount_percent}%)</td>
                    <td className="text-end">−{fmt(Number(quote.subtotal) - Number(quote.net_total))}</td>
                  </tr>
                  <tr className="table-dark">
                    <td colSpan={4} className="text-end fw-bold">Net Total</td>
                    <td className="text-end fw-bold">{fmt(quote.net_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="d-flex gap-2">
            {!isApproved && (
              <Link to={`/quotes/${quote.id}/new-version`} className="btn btn-outline-primary btn-sm">
                Create New Version
              </Link>
            )}
            {!isApproved && (
              <button
                className="btn btn-outline-danger btn-sm"
                disabled={quote.status_code !== "PENDING_APPROVAL"}
                onClick={handleReject}
              >
                Reject
              </button>
            )}
            <button className="btn btn-outline-dark btn-sm" disabled onClick={() => toast.info("Coming soon")}>
              Export as PDF
            </button>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header fw-semibold">Version History</div>
            <div className="list-group list-group-flush">
              {versions.map((v) => (
                <Link
                  key={v.id}
                  to={`/quotes/${v.id}`}
                  className={`list-group-item list-group-item-action version-history-item ${v.id === quote.id ? "active" : ""}`}
                >
                  <div className="d-flex justify-content-between">
                    <span>{v.version_label}</span>
                    {statusBadge(v.status_code)}
                  </div>
                  <small className={v.id === quote.id ? "" : "text-muted"}>
                    {fmt(v.net_total)} · {new Date(v.updated_at).toLocaleDateString()}
                  </small>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetails;
