interface LineItem {
  label: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_type: string;
}

interface CalcPanelProps {
  productName: string;
  productBasePrice: number;
  additionalItems: LineItem[];
  discountPercent: number;
  onDiscountChange: (val: number) => void;
  readOnly?: boolean;
}

const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const CalcPanel = ({ productName, productBasePrice, additionalItems, discountPercent, onDiscountChange, readOnly }: CalcPanelProps) => {
  const productTotal = productBasePrice;
  const addTotal = additionalItems.reduce((s, i) => s + i.line_total, 0);
  const subtotal = productTotal + addTotal;
  const netTotal = subtotal * (1 - discountPercent / 100);

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
            <span>{item.label} × {item.quantity}</span>
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
            type="number"
            className="form-control form-control-sm"
            value={discountPercent}
            min={0}
            max={100}
            disabled={readOnly}
            onChange={(e) => {
              let v = parseInt(e.target.value) || 0;
              if (v < 0) v = 0;
              if (v > 100) v = 100;
              onDiscountChange(v);
            }}
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
