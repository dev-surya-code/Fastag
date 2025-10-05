import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function WorkerLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "https://vettai-fastag.onrender.com/api/auth/worker/login",
        form
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username || form.username);
      localStorage.setItem("role", res.data.role);
      const worker = res.data.username || form.username;
      // Store worker name in localStorage for logout use
      localStorage.setItem("worker", worker);
      setMsg("Login successful!");

      // Redirect to Worker Dashboard with loginTime
      navigate("/worker/dashboard", {
        state: { loginTime: res.data.loginTime },
      });
    } catch (err) {
      setMsg(err.response?.data?.msg || "Error occurred");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-4 shadow" style={{ width: "350px" }}>
        <h3 className="text-center mb-3">Worker Login</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Username"
            name="username"
            onChange={handleChange}
          />
          <input
            type="password"
            className="form-control mb-3"
            placeholder="Password"
            name="password"
            onChange={handleChange}
          />
          <button className="btn btn-success w-100">Login</button>
        </form>

        <div className="d-flex justify-content-between mt-2">
          <Link to="/forgot">Forgot Password?</Link>
          <Link to="/worker/signup">Signup</Link>
        </div>

        {msg && <p className="text-center text-muted mt-2">{msg}</p>}
      </div>
    </div>
  );
}
