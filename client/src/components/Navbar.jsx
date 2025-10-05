import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const [role, setRole] = useState("worker"); // default role
  const navigate = useNavigate();

  const toggleRole = () => {
    const newRole = role === "worker" ? "owner" : "worker";
    setRole(newRole);
    navigate(`/${newRole}/login`);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bolder" to="/">
          VETTAI FASTAG
        </Link>
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item">
              <button
                className="btn btn-outline-light btn-sm"
                onClick={toggleRole}
              >
                {role === "owner" ? "Worker" : "Owner"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
