import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user came from password reset email link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsValidSession(true);
        
        // Fetch user name from users table
        if (session.user.id) {
          const { data: userData } = await supabase
            .from("users")
            .select("name")
            .eq("id", session.user.id)
            .single();
          
          if (userData?.name) {
            setUserName(userData.name);
          } else {
            // Fallback to email if name not found
            setUserName(session.user.email?.split('@')[0] || "User");
          }
        }
      } else {
        toast.error("Invalid or expired reset link");
        navigate("/forgot-password");
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        // Check if error is about same password
        if (error.message.toLowerCase().includes("same") || 
            error.message.toLowerCase().includes("new password should be different")) {
          toast.error("New password cannot be the same as your old password");
        } else {
          toast.error(error.message || "Failed to update password");
        }
        setLoading(false);
        return;
      }

      toast.success("Password updated successfully!");
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
      setLoading(false);
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card-body p-4">
          <h2 className="text-center mb-2">Quote Management</h2>
          {userName && (
            <p className="text-center text-muted mb-4">
              Hi <strong>{userName}</strong>, create a new password.
            </p>
          )}
          {!userName && (
            <h5 className="text-center text-muted mb-4">Reset Password</h5>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                autoComplete="new-password"
              />
              <small className="text-muted">Minimum 6 characters</small>
            </div>

            <div className="mb-4">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
