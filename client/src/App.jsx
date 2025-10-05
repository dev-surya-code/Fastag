import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import WorkerSignup from "./pages/WorkerSignup";
import ForgotPassword from "./pages/ForgotPassword";
import WorkerLogin from "./pages/WorkerLogin";
import OwnerLogin from "./pages/OwnerLogin";
import WorkerDashboard from "./pages/WorkerDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import "./App.css";
import Loader from "./components/Loader";
function App() {
  const [worker, setWorker] = useState(null); // Initialize worker state

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fake loading for 2 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loader />;
  }
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/" element={<Navbar />} />
        <Route path="/worker/signup" element={<WorkerSignup />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/worker/login" element={<WorkerLogin />} />
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route
          path="/worker/dashboard"
          element={<WorkerDashboard worker={worker} />}
        />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
