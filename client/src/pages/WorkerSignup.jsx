import { useState } from "react";
import axios from "axios";
import { FaSignInAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function WorkerSignup() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/worker/signup",
        form
      );
      setMsg(res.data.msg);
    } catch (err) {
      setMsg(err.response?.data?.msg || "Error occurred");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div
        className="card p-4 shadow"
        style={{ width: "350px", position: "relative" }}
      >
        {/* Icon redirect */}
        <FaSignInAlt
          className="position-absolute"
          style={{
            top: "10px",
            right: "10px",
            cursor: "pointer",
            fontSize: "20px",
          }}
          onClick={() => navigate("/worker/login")}
          title="Go to Worker Login"
        />

        <h3 className="text-center mb-3">Worker Sign Up</h3>
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
            className="form-control mb-2"
            placeholder="Password"
            name="password"
            onChange={handleChange}
          />
          <input
            type="password"
            className="form-control mb-3"
            placeholder="Confirm Password"
            name="confirmPassword"
            onChange={handleChange}
          />
          <button className="btn btn-primary w-100">Sign Up</button>
        </form>
        {msg && <p className="text-center text-muted mt-2">{msg}</p>}
      </div>
    </div>
  );
}
