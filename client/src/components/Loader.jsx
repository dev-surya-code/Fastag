// Loader.js
import React from "react";
import "../css/Loader.css";
export default function Loader() {
  return (
    <div className="loader-container">
      <img src="/vettai_fastag_logo.png" alt="Logo" className="loader-logo" />
      <div className="spinner"></div>
    </div>
  );
}
