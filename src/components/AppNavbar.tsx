import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AppNavbarProps {
  quoteStatus?: string | null;
  onApprove?: () => void;
  onReject?: () => void;
}

const AppNavbar = ({ quoteStatus, onApprove, onReject }: AppNavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const isDetailsPage = /^\/quotes\/[^/]+$/.test(location.pathname) && !location.pathname.endsWith("/new-version");

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand navbar-dark bg-light px-3">
      <Link className="navbar-brand" to="/quotes">
        Quote Management
      </Link>
      <div className="ms-auto d-flex gap-2 align-items-center">
        {userProfile && (
          <span className="text-muted small me-2">
            {userProfile.name}
          </span>
        )}
        {isDetailsPage && userProfile?.can_approve && onReject && (
          <button
            className="btn btn-outline-danger btn-sm"
            disabled={quoteStatus !== "PENDING_APPROVAL"}
            onClick={onReject}
          >
            ✗ Reject
          </button>
        )}
        {isDetailsPage && userProfile?.can_approve && onApprove && (
          <button
            className="btn btn-success btn-sm"
            disabled={quoteStatus !== "PENDING_APPROVAL"}
            onClick={onApprove}
          >
            ✓ Approve
          </button>
        )}
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default AppNavbar;
