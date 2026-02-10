import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

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

const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const QuotesList = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});

  const load = async () => {
    let query = supabase
      .from("quotes")
      .select("*, companies(name)")
      .eq("is_latest", true)
      .order("created_at", { ascending: false });

    if (filter !== "ALL") {
      query = query.eq("status_code", filter);
    }
    const { data } = await query;
    setQuotes(data || []);

    // get version counts per group
    if (data && data.length > 0) {
      const groupIds = [...new Set(data.map((q: any) => q.quote_group_id))];
      const { data: allVersions } = await supabase
        .from("quotes")
        .select("quote_group_id")
        .in("quote_group_id", groupIds);
      const counts: Record<string, number> = {};
      allVersions?.forEach((v: any) => {
        counts[v.quote_group_id] = (counts[v.quote_group_id] || 0) + 1;
      });
      setVersionCounts(counts);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Quotations</h4>
        <Link to="/quotes/new" className="btn btn-primary btn-sm">
          + Create New Quote
        </Link>
      </div>

      <div className="mb-3" style={{ maxWidth: 200 }}>
        <select className="form-select form-select-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Company</th>
              <th>Net Total</th>
              <th>Status</th>
              <th>Version</th>
              <th>Versions</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted py-4">No quotes found</td></tr>
            )}
            {quotes.map((q, i) => {
              const older = (versionCounts[q.quote_group_id] || 1) - 1;
              return (
                <tr key={q.id}>
                  <td>{i + 1}</td>
                  <td>
                    <Link to={`/quotes/${q.id}`} className="text-decoration-none fw-medium">
                      {q.companies?.name || "—"}
                    </Link>
                  </td>
                  <td>{fmt(q.net_total)}</td>
                  <td>{statusBadge(q.status_code)}</td>
                  <td><small className="text-muted">{q.version_label}</small></td>
                  <td>{older > 0 ? <small className="text-muted">{older} older</small> : "—"}</td>
                  <td>
                    <Link to={`/quotes/${q.id}`} className="btn btn-outline-dark btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotesList;
