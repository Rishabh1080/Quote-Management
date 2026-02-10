interface LineItem {
  label: string;
  description?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_type: string;
}

interface CalcPanelProps {
  productName: string;
  productBasePrice: number;
  additionalItems: LineItem[];
  discountPercent: number | string;
  onDiscountChange: (val: number | string) => void;
  readOnly?: boolean;
  discountError?: boolean;
  onDiscountBlur?: () => void;
}

const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const CalcPanel = ({ productName, productBasePrice, additionalItems, discountPercent, onDiscountChange, readOnly, discountError, onDiscountBlur }: CalcPanelProps) => {
  const productTotal = productBasePrice;
  const addTotal = additionalItems.reduce((s, i) => s + i.line_total, 0);
  const subtotal = productTotal + addTotal;
  const netTotal = subtotal * (1 - (Number(discountPercent) || 0) / 100);

  return (
    <div className="card calc-card">
      <div className="card-header fw-semibold">Calculation</div>
      <ul className="list-group list-group-flush">
        {productName && (
          <li className="list-group-item d-flex justify-content-between">
            <span>{productName} (base)</span>
            <span>{fmt(productTotal)}</span>
          </li>
        )}
        {additionalItems.map((item, i) => (
          <li key={i} className="list-group-item d-flex justify-content-between">
            <div className="calc-item-label">
              <div>{item.label} × {item.quantity}</div>
              {item.description && <div className="calc-item-description">{item.description}</div>}
            </div>
            <span>{fmt(item.line_total)}</span>
          </li>
        ))}
      </ul>
      <div className="card-body">
        <div className="d-flex justify-content-between mb-2">
          <strong>Subtotal</strong>
          <strong>{fmt(subtotal)}</strong>
        </div>
        <div className="mb-2">
          <label className="form-label mb-1 small">Discount %</label>
          <input
            type="text"
            className={`form-control form-control-sm ${discountError ? 'is-invalid' : ''}`}
            value={discountPercent}
            disabled={readOnly}
            inputMode="numeric"
            onChange={(e) => {
              onDiscountChange(e.target.value);
            }}
            onBlur={onDiscountBlur}
          />
        </div>
        <div className="d-flex justify-content-between border-top pt-2">
          <strong className="fs-5">Net Total</strong>
          <strong className="fs-5">{fmt(netTotal)}</strong>
        </div>
      </div>
    </div>
  );
};

export default CalcPanel;
