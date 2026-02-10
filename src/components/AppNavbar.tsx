import { Link, useLocation, useParams } from "react-router-dom";

interface AppNavbarProps {
  quoteStatus?: string | null;
  onApprove?: () => void;
}

const AppNavbar = ({ quoteStatus, onApprove }: AppNavbarProps) => {
  const location = useLocation();
  const isDetailsPage = /^\/quotes\/[^/]+$/.test(location.pathname) && !location.pathname.endsWith("/new-version");

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/quotes">
        Quote Mng
      </Link>
      <div className="ms-auto">
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
