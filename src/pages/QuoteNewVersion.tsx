import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import QuoteForm from "@/components/QuoteForm";

const QuoteNewVersion = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [prefill, setPrefill] = useState<any>(null);
  const [groupId, setGroupId] = useState<string>("");

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
      const additionalItems = (q.quote_line_items || [])
        .filter((li: any) => li.item_type !== "PRODUCT_BASE")
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((li: any) => ({
          code: li.item_type,
          label: li.label,
          quantity: li.quantity,
          unit_price: Number(li.unit_price),
        }));

      setPrefill({
        company_id: q.company_id,
        product_id: q.product_id,
        discount_percent: q.discount_percent,
        additionalItems,
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
      <h4 className="mb-3">Create New Version</h4>
      <QuoteForm prefill={prefill} quoteGroupId={groupId} sourceQuoteId={id} />
    </div>
  );
};

export default QuoteNewVersion;
