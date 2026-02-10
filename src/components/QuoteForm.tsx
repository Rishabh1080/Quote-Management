import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import CalcPanel from "./CalcPanel";
import { toast } from "sonner";

interface AdditionalRow {
  code: string;
  label: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuoteFormProps {
  prefill?: {
    company_id: string;
    product_id: string;
    discount_percent: number;
    additionalItems: AdditionalRow[];
  };
  quoteGroupId?: string;
  sourceQuoteId?: string;
  renderActions?: (saving: boolean, saveQuote: (status: string) => void) => React.ReactNode;
}

const QuoteForm = ({ prefill, quoteGroupId, renderActions }: QuoteFormProps) => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [costMaster, setCostMaster] = useState<any[]>([]);

  const [companyId, setCompanyId] = useState(prefill?.company_id || "");
  const [productId, setProductId] = useState(prefill?.product_id || "");
  const [discountPercent, setDiscountPercent] = useState(prefill?.discount_percent || 0);
  const [additionalItems, setAdditionalItems] = useState<AdditionalRow[]>(prefill?.additionalItems || []);
  const [saving, setSaving] = useState(false);
  const [costDefaults, setCostDefaults] = useState<Record<string, string>>({});

  const selectedProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    const load = async () => {
      const [c, p, a] = await Promise.all([
        supabase.from("companies").select("*").order("name"),
        supabase.from("products").select("*").order("name"),
        supabase.from("additional_costs").select("*"),
      ]);
      setCompanies(c.data || []);
      setProducts(p.data || []);
      setCostMaster(a.data || []);
    };
    load();
  }, []);

  const calcLineItems = () => {
    const lines: any[] = [];
    if (selectedProduct) {
      lines.push({
        item_type: "PRODUCT_BASE",
        label: selectedProduct.name,
        quantity: 1,
        unit_price: Number(selectedProduct.base_price),
        line_total: Number(selectedProduct.base_price),
        sort_order: 0,
      });
    }
    additionalItems.forEach((item, i) => {
      lines.push({
        item_type: item.code,
        label: item.label,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        line_total: item.quantity * Number(item.unit_price),
        sort_order: i + 1,
      });
    });
    return lines;
  };

  const allDefaultsFilled = costMaster.length > 0 && costMaster.every((c) => {
    const val = costDefaults[c.code];
    return val !== undefined && val !== "" && !isNaN(Number(val));
  });

  const addRow = () => {
    if (!allDefaultsFilled) return;
    const first = costMaster[0];
    if (!first) return;
    const unitPrice = Number(costDefaults[first.code]) || Number(first.default_unit_price);
    setAdditionalItems([...additionalItems, { code: first.code, label: first.label, description: "", quantity: 1, unit_price: unitPrice }]);
  };

  const updateRow = (index: number, field: string, value: any) => {
    const copy = [...additionalItems];
    if (field === "code") {
      const master = costMaster.find((c) => c.code === value);
      if (master) {
        const unitPrice = Number(costDefaults[value]) || Number(master.default_unit_price);
        copy[index] = { ...copy[index], code: value, label: master.label, unit_price: unitPrice };
      }
    } else if (field === "description") {
      copy[index] = { ...copy[index], description: value };
    } else if (field === "quantity") {
      let q = parseInt(value) || 0;
      if (q < 1) q = 1;
      copy[index] = { ...copy[index], quantity: q };
    } else if (field === "unit_price") {
      copy[index] = { ...copy[index], unit_price: Number(value) || 0 };
    }
    setAdditionalItems(copy);
  };

  const removeRow = (index: number) => {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index));
  };

  const saveQuote = async (statusCode: string) => {
    if (!companyId || !productId) {
      toast.error("Company and Product are required");
      return;
    }
    setSaving(true);
    try {
      const lines = calcLineItems();
      const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
      const netTotal = subtotal * (1 - discountPercent / 100);
      const today = new Date().toISOString().slice(0, 10);

      let groupId = quoteGroupId || crypto.randomUUID();
      let versionNumber = 0;

      if (quoteGroupId) {
        // new version: find max version_number
        const { data: existing } = await supabase
          .from("quotes")
          .select("version_number")
          .eq("quote_group_id", quoteGroupId)
          .order("version_number", { ascending: false })
          .limit(1);
        const maxVer = existing?.[0]?.version_number ?? 0;
        versionNumber = maxVer + 1;

        // set previous latest to false
        await supabase
          .from("quotes")
          .update({ is_latest: false })
          .eq("quote_group_id", quoteGroupId)
          .eq("is_latest", true);
      }

      const versionLabel = `V${versionNumber}/${today}`;

      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          quote_group_id: groupId,
          version_number: versionNumber,
          version_label: versionLabel,
          is_latest: true,
          status_code: statusCode,
          company_id: companyId,
          product_id: productId,
          discount_percent: discountPercent,
          subtotal,
          net_total: netTotal,
        })
        .select()
        .single();

      if (error) throw error;

      // insert line items
      const lineRows = lines.map((l) => ({ ...l, quote_id: quote.id }));
      const { error: lineErr } = await supabase.from("quote_line_items").insert(lineRows);
      if (lineErr) throw lineErr;

      toast.success("Quote saved!");
      navigate("/quotes");
    } catch (err: any) {
      toast.error(err.message || "Error saving quote");
    } finally {
      setSaving(false);
    }
  };

  const calcAdditionalForPanel = () =>
    additionalItems.map((item) => ({
      label: item.label,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      item_type: item.code,
    }));

  return (
    <>
    {renderActions?.(saving, saveQuote)}
    <div className="row g-4">
      <div className="col-lg-7">
        <div className="card">
          <div className="card-body">
            {/* Company */}
            <div className="mb-3">
              <label className="form-label">Company *</label>
              <select className="form-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Product */}
            <div className="mb-3">
              <label className="form-label">Product *</label>
              <select className="form-select" value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="alert alert-info py-2">
                Selected product: <strong>{selectedProduct.name}</strong> — Base price: <strong>₹{Number(selectedProduct.base_price).toLocaleString("en-IN")}</strong>
              </div>
            )}

            {/* Cost Defaults */}
            {costMaster.length > 0 && (
              <div className="card bg-light mb-3">
                <div className="card-body py-2">
                  <label className="form-label mb-2 fw-semibold" style={{ fontSize: "0.85rem" }}>Set Default Costs</label>
                  <div className="row g-2">
                    {costMaster.map((c) => (
                      <div key={c.code} className="col-sm-4">
                        <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>{c.label}</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder={`₹ ${c.default_unit_price}`}
                          value={costDefaults[c.code] ?? ""}
                          onChange={(e) => setCostDefaults({ ...costDefaults, [c.code]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Additional items */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label mb-0">Additional Items</label>
                <button
                  className="btn btn-outline-primary btn-sm"
                  type="button"
                  onClick={addRow}
                  disabled={!allDefaultsFilled}
                  title={!allDefaultsFilled ? "Please fill all default costs first" : ""}
                >
                  + Add expense
                </button>
              </div>
              {additionalItems.length > 0 && (
                <div className="row g-2 mb-1">
                  <div className="col-sm-3"><small className="text-muted fw-semibold">Type</small></div>
                  <div className="col-sm-3"><small className="text-muted fw-semibold">Description</small></div>
                  <div className="col-sm-2"><small className="text-muted fw-semibold">Quantity</small></div>
                  <div className="col-sm-2"><small className="text-muted fw-semibold">Cost</small></div>
                  <div className="col-sm-2"></div>
                </div>
              )}
              {additionalItems.map((item, i) => (
                <div key={i} className="row g-2 mb-2 align-items-end">
                  <div className="col-sm-3">
                    <select className="form-select form-select-sm" value={item.code} onChange={(e) => updateRow(i, "code", e.target.value)}>
                      {costMaster.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-sm-3">
                    <input type="text" className="form-control form-control-sm" placeholder="Description" value={item.description} onChange={(e) => updateRow(i, "description", e.target.value)} />
                  </div>
                  <div className="col-sm-2">
                    <input type="number" className="form-control form-control-sm" placeholder="Qty" value={item.quantity} min={1} onChange={(e) => updateRow(i, "quantity", e.target.value)} />
                  </div>
                  <div className="col-sm-2">
                    <input type="number" className="form-control form-control-sm" placeholder="Unit price" value={item.unit_price} onChange={(e) => updateRow(i, "unit_price", e.target.value)} />
                  </div>
                  <div className="col-sm-2">
                    <button className="btn btn-outline-danger btn-sm w-100" onClick={() => removeRow(i)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        </div>

      <div className="col-lg-5">
        <CalcPanel
          productName={selectedProduct?.name || ""}
          productBasePrice={selectedProduct ? Number(selectedProduct.base_price) : 0}
          additionalItems={calcAdditionalForPanel()}
          discountPercent={discountPercent}
          onDiscountChange={setDiscountPercent}
        />
      </div>
    </div>
    </>
  );
};

export default QuoteForm;
