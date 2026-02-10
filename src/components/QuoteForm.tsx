import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import CalcPanel from "./CalcPanel";
import { toast } from "sonner";

interface AdditionalRow {
  code: string;
  label: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
}

interface QuoteFormProps {
  prefill?: {
    company_id: string;
    product_id: string;
    discount_percent: number;
    additionalItems: AdditionalRow[];
    costDefaults?: Record<string, string>;
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
  const [discountPercent, setDiscountPercent] = useState<number | string>(prefill?.discount_percent ?? "");
  const [additionalItems, setAdditionalItems] = useState<AdditionalRow[]>(prefill?.additionalItems || []);
  const [saving, setSaving] = useState(false);
  const [costDefaults, setCostDefaults] = useState<Record<string, string>>(prefill?.costDefaults || {});
  const [costDefaultsErrors, setCostDefaultsErrors] = useState<Record<string, boolean>>({});
  const [expenseErrors, setExpenseErrors] = useState<Record<number, { quantity?: boolean; unit_price?: boolean }>>({});
  const [discountError, setDiscountError] = useState(false);

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

  // Clear discount error when user types
  useEffect(() => {
    if (discountPercent !== "" && !isNaN(Number(discountPercent))) {
      setDiscountError(false);
    }
  }, [discountPercent]);

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
      let unitPrice = Number(item.unit_price) || 0;
      const quantity = Number(item.quantity) || 0;
      
      // Special calculation for STAY_MAN_DAYS
      if (item.code === 'STAY_MAN_DAYS') {
        const manDaysCost = Number(costDefaults['MAN_DAYS']) || 0;
        const stayManDaysCost = Number(costDefaults['STAY_MAN_DAYS']) || 0;
        unitPrice = manDaysCost + stayManDaysCost;
      }
      
      lines.push({
        item_type: item.code,
        label: item.label,
        description: item.description || "",
        quantity: quantity,
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
        sort_order: i + 1,
      });
    });
    return lines;
  };

  const allDefaultsFilled = costMaster.filter(c => c.code !== 'FIXED').length > 0 && costMaster.filter(c => c.code !== 'FIXED').every((c) => {
    const val = costDefaults[c.code];
    return val !== undefined && val !== "" && !isNaN(Number(val));
  });

  const validateCostDefault = (code: string) => {
    const val = costDefaults[code];
    if (!val || val === "" || isNaN(Number(val))) {
      setCostDefaultsErrors({ ...costDefaultsErrors, [code]: true });
    }
  };

  const addRow = () => {
    // Check if all defaults are filled
    if (!allDefaultsFilled) {
      // Mark empty fields as errors
      const errors: Record<string, boolean> = {};
      costMaster.filter(c => c.code !== 'FIXED').forEach((c) => {
        const val = costDefaults[c.code];
        if (!val || val === "" || isNaN(Number(val))) {
          errors[c.code] = true;
        }
      });
      setCostDefaultsErrors(errors);
      return;
    }
    
    // Clear any errors
    setCostDefaultsErrors({});
    
    // Default to FIXED type with empty values
    const fixedCost = costMaster.find((c) => c.code === 'FIXED');
    if (!fixedCost) return;
    const unitPrice = costDefaults['FIXED'] || "";
    setAdditionalItems([...additionalItems, { code: 'FIXED', label: fixedCost.label, description: "", quantity: "", unit_price: unitPrice }]);
  };

  const updateRow = (index: number, field: string, value: any) => {
    const copy = [...additionalItems];
    if (field === "code") {
      const master = costMaster.find((c) => c.code === value);
      if (master) {
        let unitPrice: number | string = "";
        
        // Get unit price from costDefaults based on type
        if (value === 'FIXED') {
          unitPrice = costDefaults['FIXED'] || "";
        } else if (value === 'MAN_DAYS') {
          unitPrice = Number(costDefaults['MAN_DAYS']) || 0;
        } else if (value === 'STAY_MAN_DAYS') {
          // Special calculation for STAY_MAN_DAYS: unit_price = man_days + stay_man_days
          const manDaysCost = Number(costDefaults['MAN_DAYS']) || 0;
          const stayManDaysCost = Number(costDefaults['STAY_MAN_DAYS']) || 0;
          unitPrice = manDaysCost + stayManDaysCost;
        }
        
        copy[index] = { ...copy[index], code: value, label: master.label, unit_price: unitPrice };
      }
    } else if (field === "description") {
      copy[index] = { ...copy[index], description: value };
    } else if (field === "quantity") {
      copy[index] = { ...copy[index], quantity: value };
      // Clear error when user types
      if (expenseErrors[index]?.quantity) {
        const errors = { ...expenseErrors };
        if (errors[index]) {
          delete errors[index].quantity;
          if (Object.keys(errors[index]).length === 0) delete errors[index];
        }
        setExpenseErrors(errors);
      }
    } else if (field === "unit_price") {
      // Only allow editing unit_price for FIXED type
      if (copy[index].code === 'FIXED') {
        copy[index] = { ...copy[index], unit_price: value };
        // Clear error when user types
        if (expenseErrors[index]?.unit_price) {
          const errors = { ...expenseErrors };
          if (errors[index]) {
            delete errors[index].unit_price;
            if (Object.keys(errors[index]).length === 0) delete errors[index];
          }
          setExpenseErrors(errors);
        }
      }
    }
    setAdditionalItems(copy);
  };

  const validateExpenseField = (index: number, field: 'quantity' | 'unit_price') => {
    const item = additionalItems[index];
    const errors = { ...expenseErrors };
    
    if (field === 'quantity') {
      const qty = Number(item.quantity);
      if (!item.quantity || item.quantity === "" || isNaN(qty) || qty < 1) {
        if (!errors[index]) errors[index] = {};
        errors[index].quantity = true;
      }
    } else if (field === 'unit_price' && item.code === 'FIXED') {
      const cost = Number(item.unit_price);
      if (!item.unit_price || item.unit_price === "" || isNaN(cost) || cost <= 0) {
        if (!errors[index]) errors[index] = {};
        errors[index].unit_price = true;
      }
    }
    
    setExpenseErrors(errors);
  };

  const validateDiscount = () => {
    const discount = Number(discountPercent);
    if (discountPercent === "" || discountPercent === null || discountPercent === undefined || isNaN(discount)) {
      setDiscountError(true);
    }
  };

  const removeRow = (index: number) => {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index));
  };

  const saveQuote = async (statusCode: string) => {
    if (!companyId || !productId) {
      toast.error("Company and Product are required");
      return;
    }
    
    // Validate that mandatory costs are filled
    if (!costDefaults['MAN_DAYS'] || !costDefaults['STAY_MAN_DAYS']) {
      toast.error("Man days and Stay costs are required");
      return;
    }
    
    // Validate discount is filled (can be 0 but must be a number)
    if (discountPercent === "" || discountPercent === null || discountPercent === undefined || isNaN(Number(discountPercent))) {
      toast.error("Discount percentage is required");
      return;
    }
    
    // For "Submit for Approval", validate all expense items have quantity and cost
    if (statusCode === 'PENDING_APPROVAL') {
      for (let i = 0; i < additionalItems.length; i++) {
        const item = additionalItems[i];
        const qty = Number(item.quantity);
        if (!item.quantity || item.quantity === "" || isNaN(qty) || qty < 1) {
          toast.error(`Expense item ${i + 1}: Quantity is required`);
          return;
        }
        if (item.code === 'FIXED') {
          const cost = Number(item.unit_price);
          if (!item.unit_price || item.unit_price === "" || isNaN(cost) || cost <= 0) {
            toast.error(`Expense item ${i + 1}: Cost is required for Fixed items`);
            return;
          }
        }
      }
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
          discount_percent: Number(discountPercent),
          subtotal,
          net_total: netTotal,
          fixed_cost: costDefaults['FIXED'] ? Number(costDefaults['FIXED']) : null,
          man_days_cost: Number(costDefaults['MAN_DAYS']),
          stay_man_days_cost: Number(costDefaults['STAY_MAN_DAYS']),
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
    additionalItems.map((item) => {
      let unitPrice = Number(item.unit_price) || 0;
      const quantity = Number(item.quantity) || 0;
      
      // Special calculation for STAY_MAN_DAYS
      if (item.code === 'STAY_MAN_DAYS') {
        const manDaysCost = Number(costDefaults['MAN_DAYS']) || 0;
        const stayManDaysCost = Number(costDefaults['STAY_MAN_DAYS']) || 0;
        unitPrice = manDaysCost + stayManDaysCost;
      }
      
      return {
        label: item.label,
        description: item.description,
        quantity: quantity,
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
        item_type: item.code,
      };
    });

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
            {costMaster.filter(c => c.code !== 'FIXED').length > 0 && (
              <div className="card bg-light mb-3">
                <div className="card-body py-2">
                  <label className="form-label mb-2 fw-semibold" style={{ fontSize: "0.85rem" }}>Set Default Costs</label>
                  <div className="row g-2">
                    {costMaster.filter(c => c.code !== 'FIXED').map((c) => (
                      <div key={c.code} className="col-sm-4">
                        <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>{c.label}</label>
                        <input
                          type="text"
                          className={`form-control form-control-sm ${costDefaultsErrors[c.code] ? 'is-invalid' : ''}`}
                          value={costDefaults[c.code] ?? ""}
                          inputMode="numeric"
                          onChange={(e) => {
                            setCostDefaults({ ...costDefaults, [c.code]: e.target.value });
                            // Clear error when user starts typing
                            if (costDefaultsErrors[c.code]) {
                              setCostDefaultsErrors({ ...costDefaultsErrors, [c.code]: false });
                            }
                          }}
                          onBlur={() => validateCostDefault(c.code)}
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
              {additionalItems.map((item, i) => {
                // Calculate display unit price for STAY_MAN_DAYS
                let displayUnitPrice: number | string = item.unit_price;
                if (item.code === 'STAY_MAN_DAYS') {
                  const manDaysCost = Number(costDefaults['MAN_DAYS']) || 0;
                  const stayManDaysCost = Number(costDefaults['STAY_MAN_DAYS']) || 0;
                  displayUnitPrice = manDaysCost + stayManDaysCost;
                }
                
                // Only FIXED type can edit unit price
                const isUnitPriceEditable = item.code === 'FIXED';
                
                return (
                <div key={i} className="row g-2 mb-2 align-items-end">
                  <div className="col-sm-3">
                    <select className="form-select form-select-sm" value={item.code} onChange={(e) => updateRow(i, "code", e.target.value)}>
                      {costMaster.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-sm-3">
                    <input type="text" className="form-control form-control-sm" value={item.description} onChange={(e) => updateRow(i, "description", e.target.value)} />
                  </div>
                  <div className="col-sm-2">
                    <input 
                      type="text" 
                      className={`form-control form-control-sm ${expenseErrors[i]?.quantity ? 'is-invalid' : ''}`}
                      value={item.quantity} 
                      onChange={(e) => updateRow(i, "quantity", e.target.value)}
                      onBlur={() => validateExpenseField(i, 'quantity')}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="col-sm-2">
                    <input 
                      type="text" 
                      className={`form-control form-control-sm ${expenseErrors[i]?.unit_price ? 'is-invalid' : ''}`}
                      value={displayUnitPrice} 
                      onChange={(e) => updateRow(i, "unit_price", e.target.value)}
                      onBlur={() => validateExpenseField(i, 'unit_price')}
                      readOnly={!isUnitPriceEditable}
                      disabled={!isUnitPriceEditable}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="col-sm-2">
                    <button className="btn btn-outline-danger btn-sm w-100" onClick={() => removeRow(i)}>✕</button>
                  </div>
                </div>
                );
              })}
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
          discountError={discountError}
          onDiscountBlur={validateDiscount}
        />
      </div>
    </div>
    </>
  );
};

export default QuoteForm;
