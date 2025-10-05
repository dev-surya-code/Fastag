import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // In real app, send reset link via backend
    setMsg(`Reset link sent to ${email}`);
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-4 shadow" style={{ width: "350px" }}>
        <h3 className="text-center mb-3">Forgot Password</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="form-control mb-3"
            placeholder="Enter your email"
            value={"sr260008@gmail.com"}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn btn-warning w-100">Send Reset Link</button>
        </form>
        {msg && <p className="text-center text-muted mt-2">{msg}</p>}
      </div>
    </div>
  );
}
