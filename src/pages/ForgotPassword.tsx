import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    if (!email) {
      const msg = "Please enter your email";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      // Use environment variable or fallback to current origin
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectUrl = `${baseUrl}/reset-password`;
        
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        // Handle rate limit error specifically
        let msg = "";
        if (error.message.toLowerCase().includes("rate limit") || 
            error.message.toLowerCase().includes("too many")) {
          msg = "Too many password reset attempts. Please try again in an hour.";
        } else {
          msg = error.message || "Failed to send reset email";
        }
        setErrorMessage(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      setEmailSent(true);
      toast.success("Password reset link sent to your email");
    } catch (error: any) {
      const msg = error.message || "Failed to send reset email";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card-body p-4">
          <h2 className="text-center mb-4">Quote Management</h2>
          <h5 className="text-center text-muted mb-4">Forgot Password</h5>
          
          {errorMessage && (
            <div className="alert alert-danger" role="alert">
              {errorMessage}
            </div>
          )}
          
          {emailSent ? (
            <div>
              <div className="alert alert-success" role="alert">
                <i className="bi bi-check-circle me-2"></i>
                Password reset link has been sent to your email. Please check your inbox.
              </div>
              <Link to="/login" className="btn btn-outline-primary w-100">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-muted mb-3">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <div className="mb-4">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 mb-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <Link to="/login" className="btn btn-outline-secondary w-100">
                Back to Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
