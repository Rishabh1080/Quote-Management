import { Link, useLocation, useParams } from "react-router-dom";

interface AppNavbarProps {
  quoteStatus?: string | null;
  onApprove?: () => void;
  onReject?: () => void;
}

const AppNavbar = ({ quoteStatus, onApprove, onReject }: AppNavbarProps) => {
  const location = useLocation();
  const isDetailsPage = /^\/quotes\/[^/]+$/.test(location.pathname) && !location.pathname.endsWith("/new-version");

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/quotes">
        Quote Mng
      </Link>
      <div className="ms-auto d-flex gap-2">
        {isDetailsPage && onReject && (
          <button
            className="btn btn-outline-danger btn-sm"
            disabled={quoteStatus !== "PENDING_APPROVAL"}
            onClick={onReject}
          >
            ✗ Reject
          </button>
        )}
        {isDetailsPage && onApprove && (
          <button
            className="btn btn-success btn-sm"
            disabled={quoteStatus !== "PENDING_APPROVAL"}
            onClick={onApprove}
          >
            ✓ Approve
          </button>
        )}
      </div>
    </nav>
  );
};

export default AppNavbar;
