import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { generateQuotePDF } from "@/lib/pdfExport";

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
  onReject?: () => void;
}

const QuoteDetails = ({ onQuoteLoaded }: QuoteDetailsPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [contentLoading, setContentLoading] = useState(false);

  const loadVersions = async (groupId: string) => {
    const { data: vers } = await supabase
      .from("quotes")
      .select("id, version_label, status_code, net_total, updated_at")
      .eq("quote_group_id", groupId)
      .order("version_number", { ascending: false });
    setVersions(vers || []);
  };

  const loadContent = async (isInitial: boolean) => {
    if (isInitial) setLoading(true);
    else setContentLoading(true);

    const { data: q } = await supabase
      .from("quotes")
      .select("*, companies(name), products(name, base_price, description), users(name)")
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

      const { data: instData } = await supabase
        .from("instruments")
        .select("*")
        .eq("quote_id", q.id)
        .order("sort_order");
      setInstruments(instData || []);

      if (isInitial) await loadVersions(q.quote_group_id);
    }
    setLoading(false);
    setContentLoading(false);
  };

  const isInitialLoad = !quote;

  useEffect(() => {
    loadContent(isInitialLoad);
    return () => onQuoteLoaded?.(null, null);
  }, [id]);

  const handleReject = async () => {
    if (quote.status_code !== "PENDING_APPROVAL") return;
    await supabase.from("quotes").update({ status_code: "REJECTED" }).eq("id", quote.id);
    toast.success("Quote rejected");
    loadContent(false);
    loadVersions(quote.quote_group_id);
  };

  const handleExportPDF = async () => {
    if (!quote) return;
    
    // Fetch the first version (version 0) to get the creator's user ID
    const { data: firstVersion } = await supabase
      .from("quotes")
      .select("created_by")
      .eq("quote_group_id", quote.quote_group_id)
      .eq("version_number", 0)
      .single();
    
    let creatorName = "N/A";
    if (firstVersion?.created_by) {
      const { data: userData } = await supabase
        .from("users")
        .select("name")
        .eq("id", firstVersion.created_by)
        .single();
      creatorName = userData?.name || "N/A";
    }
    
    // Calculate total instrument cost
    const totalInstrumentCost = instruments.reduce((sum, inst) => 
      sum + (Number(inst.integration_cost) || 0) + (Number(inst.hardware_cost) || 0), 0
    );
    
    const pdfData = {
      company_name: quote.companies?.name || "N/A",
      product_name: quote.products?.name || "N/A",
      product_description: quote.products?.description || "",
      version_label: quote.version_label,
      created_at: quote.created_at,
      discount_percent: quote.discount_percent,
      subtotal: Number(quote.subtotal),
      net_total: Number(quote.net_total),
      created_by_name: creatorName,
      notes: quote.notes || "",
      remarks: quote.remarks || "",
      line_items: lineItems.map(item => ({
        label: item.label,
        description: item.description || "",
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        line_total: Number(item.line_total),
        item_type: item.item_type
      })),
      instruments: instruments.map(inst => ({
        instrument_name: inst.instrument_name,
        quantity: inst.quantity,
        man_days: inst.man_days,
        integration_cost: Number(inst.integration_cost),
        hardware_cost: Number(inst.hardware_cost)
      })),
      instrument_integration_cost: totalInstrumentCost
    };
    
    generateQuotePDF(pdfData);
    toast.success("PDF generated successfully");
  };

  if (loading) return <div className="container py-4"><p>Loading...</p></div>;
  if (!quote) return <div className="container py-4"><p>Quote not found.</p></div>;

  const isApproved = quote.status_code === "APPROVED";

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div className="d-flex align-items-start gap-3">
          <Link to="/quotes" className="btn btn-outline-secondary btn-sm mt-1">← Back</Link>
          <div>
            <h4 className="mb-1">{quote.companies?.name}</h4>
            <p className="text-muted mb-0">
              {quote.version_label} · {statusBadge(quote.status_code)}
              {quote.users?.name && <> · Last edited by {quote.users.name}</>}
            </p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-dark btn-sm" onClick={handleExportPDF}>
            Export as PDF
          </button>
        </div>
      </div>

      {isApproved && (
        <div className="quote-readonly-notice mb-3">✓ This quote is approved and read-only.</div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          {contentLoading ? (
            <div className="text-center py-5"><div className="spinner-border text-secondary" role="status"><span className="visually-hidden">Loading...</span></div></div>
          ) : (
          <>
          <div className="card mb-3">
            <div className="card-body">
              <p><strong>Company:</strong> {quote.companies?.name}</p>
              <p className="mb-0"><strong>Product:</strong> {quote.products?.name}</p>
            </div>
          </div>

          {(quote.remarks || quote.notes) && (
            <div className="card mb-3">
              <div className="card-body">
                {quote.remarks && (
                  <div className="mb-2">
                    <strong>Remarks:</strong>
                    <p className="mb-0 mt-1">{quote.remarks}</p>
                  </div>
                )}
                {quote.notes && (
                  <div className={quote.remarks ? "mt-3" : ""}>
                    <strong>Notes:</strong>
                    <p className="mb-0 mt-1">{quote.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card mb-3">
            <div className="card-header fw-semibold">Quotation Summary</div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id}>
                      <td>{li.label}</td>
                      <td className="text-end">{li.quantity}</td>
                      <td className="text-end">{fmt(li.unit_price)}</td>
                      <td className="text-end">{fmt(li.line_total)}</td>
                    </tr>
                  ))}
                  {instruments.length > 0 && (() => {
                    const totalInstrumentCost = instruments.reduce((sum, inst) => 
                      sum + (Number(inst.integration_cost) || 0) + (Number(inst.hardware_cost) || 0), 0
                    );
                    return (
                      <tr>
                        <td>Instrument Integration Cost</td>
                        <td className="text-end">1</td>
                        <td className="text-end">{fmt(totalInstrumentCost)}</td>
                        <td className="text-end">{fmt(totalInstrumentCost)}</td>
                      </tr>
                    );
                  })()}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-end fw-semibold">Subtotal</td>
                    <td className="text-end fw-semibold">{fmt(
                      lineItems.reduce((sum, li) => sum + Number(li.line_total), 0) +
                      instruments.reduce((sum, inst) => sum + (Number(inst.integration_cost) || 0) + (Number(inst.hardware_cost) || 0), 0)
                    )}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="text-end">Discount ({quote.discount_percent}%)</td>
                    <td className="text-end">−{fmt(
                      (lineItems.reduce((sum, li) => sum + Number(li.line_total), 0) +
                      instruments.reduce((sum, inst) => sum + (Number(inst.integration_cost) || 0) + (Number(inst.hardware_cost) || 0), 0)) *
                      (Number(quote.discount_percent) / 100)
                    )}</td>
                  </tr>
                  <tr className="table-dark">
                    <td colSpan={3} className="text-end fw-bold">Net Total</td>
                    <td className="text-end fw-bold">{fmt(
                      (lineItems.reduce((sum, li) => sum + Number(li.line_total), 0) +
                      instruments.reduce((sum, inst) => sum + (Number(inst.integration_cost) || 0) + (Number(inst.hardware_cost) || 0), 0)) *
                      (1 - Number(quote.discount_percent) / 100)
                    )}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {instruments.length > 0 && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Instruments</div>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Instrument Name</th>
                      <th className="text-end">Quantity</th>
                      <th className="text-end">Man Days</th>
                      <th className="text-end">Integration Cost</th>
                      <th className="text-end">Hardware Cost</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instruments.map((inst) => {
                      const rowTotal = (Number(inst.integration_cost) || 0) + (Number(inst.hardware_cost) || 0);
                      return (
                        <tr key={inst.id}>
                          <td>{inst.instrument_name}</td>
                          <td className="text-end">{inst.quantity}</td>
                          <td className="text-end">{inst.man_days}</td>
                          <td className="text-end">{fmt(inst.integration_cost)}</td>
                          <td className="text-end">{fmt(inst.hardware_cost)}</td>
                          <td className="text-end">{fmt(rowTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="table-secondary">
                      <td colSpan={5} className="text-end fw-semibold">Total</td>
                      <td className="text-end fw-semibold">{fmt(
                        instruments.reduce((sum, inst) => 
                          sum + (Number(inst.integration_cost) || 0) + (Number(inst.hardware_cost) || 0), 0
                        )
                      )}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          </>
          )}
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
              Version History
              {!isApproved && (
                <Link to={`/quotes/${quote.id}/new-version`} className="btn btn-outline-primary btn-sm">
                  + New Version
                </Link>
              )}
            </div>
            <div className="list-group list-group-flush">
              {versions.map((v) => (
                v.id === quote.id ? (
                  <div
                    key={v.id}
                    className="list-group-item active"
                  >
                    <div className="d-flex justify-content-between">
                      <span>{v.version_label}</span>
                      {statusBadge(v.status_code)}
                    </div>
                    <small>{fmt(v.net_total)} · {new Date(v.updated_at).toLocaleDateString()}</small>
                  </div>
                ) : (
                  <Link
                    key={v.id}
                    to={`/quotes/${v.id}`}
                    className="list-group-item list-group-item-action version-history-item"
                  >
                    <div className="d-flex justify-content-between">
                      <span>{v.version_label}</span>
                      {statusBadge(v.status_code)}
                    </div>
                    <small className="text-muted">
                      {fmt(v.net_total)} · {new Date(v.updated_at).toLocaleDateString()}
                    </small>
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetails;
