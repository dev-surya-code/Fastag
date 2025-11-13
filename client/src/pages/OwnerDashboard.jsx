import React, { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts"; // ✅ include this
import "../css/OwnerDashboard.css";
pdfMake.vfs = pdfFonts.pdfMake?.vfs;
import {
  FaSearch,
  FaFilePdf,
  FaCalendarAlt,
  FaMoneyBillAlt,
  FaTruckLoading,
  FaPlus,
  FaTrash,
  FaUserCircle,
  FaUserAlt,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { use } from "react";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function OwnerDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [records, setRecords] = useState([]);
  const [searchVehicle, setSearchVehicle] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [highlightVehicle, setHighlightVehicle] = useState(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [transports, setTransports] = useState([]);
  const [transportName, setTransportName] = useState("");
  const [transportVehicle, setTransportVehicle] = useState("");
  // 🚘 Add Vehicle Popup States
  const [showAddVehiclePopup, setShowAddVehiclePopup] = useState(false);
  const [currentTransportName, setCurrentTransportName] = useState("");
  const [newVehicleInput, setNewVehicleInput] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [transportPdfUrl, setTransportPdfUrl] = useState(null);

  const tableRef = useRef(null);
  const inputRef = useRef(null);
  const vehicleWrapperRef = useRef(null);

  // Fetch worker login records
  useEffect(() => {
    axios
      .get(`${API_URL}/api/auth/owner/activities`)
      .then((res) => setRecords(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/transactions/all`);
        setTransactions(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate pending amounts per vehicle
  const pendingAmounts = useMemo(() => {
    const result = {};
    transactions.forEach((t) => {
      const vehicle = t.vehicleNumber;
      if (!vehicle) return;
      const amt = parseFloat(t.amount || 0);
      if (!result[vehicle]) result[vehicle] = 0;

      if (t.transactionType === "PENDING" && t.paymentType === "PENDING") {
        result[vehicle] += amt;
      } else if (
        t.transactionType === "PENDING" &&
        ["CASH", "GPAY/PHONE PAY", "EXP"].includes(t.paymentType)
      ) {
        result[vehicle] -= amt;
      }
    });
    return result;
  }, [transactions]);

  // Suggestions and pending update
  useEffect(() => {
    if (!searchVehicle.trim()) {
      setSuggestions([]);
      setPendingSuggestion(null);
      setSelectedVehicle(null);
      return;
    }

    const vehicleNumbers = [
      ...new Set(transactions.map((t) => t.vehicleNumber).filter(Boolean)),
    ];

    const filtered = vehicleNumbers.filter((v) =>
      v.toLowerCase().includes(searchVehicle.toLowerCase())
    );
    setSuggestions(filtered);

    const exactMatch = filtered.find(
      (v) => v.toLowerCase() === searchVehicle.toLowerCase()
    );

    if (exactMatch) {
      setPendingSuggestion(pendingAmounts[exactMatch] || 0);
      setSelectedVehicle(exactMatch);
    } else {
      setPendingSuggestion(null);
      setSelectedVehicle(null);
    }
  }, [searchVehicle, transactions, pendingAmounts]);

  const handleSelectSuggestion = (vehicle) => {
    setSearchVehicle(vehicle);
    setSuggestions([]);
    setPendingSuggestion(pendingAmounts[vehicle] || 0);
    setSelectedVehicle(vehicle);
    setHighlightVehicle(vehicle);
  };

  // Hide dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Highlight selected vehicle in table
  useEffect(() => {
    if (highlightVehicle && tableRef.current) {
      const row = tableRef.current.querySelector(
        `tr[data-vehicle="${highlightVehicle.toLowerCase()}"]`
      );
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.classList.add("table-warning");
        setTimeout(() => row.classList.remove("table-warning"), 2000);
      }
    }
  }, [highlightVehicle]);

  // Filtered and sorted transactions
  const sortedTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesVehicle =
          !searchVehicle.trim() ||
          t.vehicleNumber?.toLowerCase().includes(searchVehicle.toLowerCase());

        const matchesPayment =
          !selectedPaymentType || t.paymentType === selectedPaymentType;

        const matchesWorker =
          !workerSearch.trim() ||
          t.worker?.toLowerCase().includes(workerSearch.toLowerCase());

        let matchesDate = true;

        if (fromDate) {
          const from = new Date(fromDate);
          const txnDate = new Date(t.createdAt);
          if (txnDate < from) matchesDate = false;
        }

        if (toDate) {
          const to = new Date(toDate);
          const txnDate = new Date(t.createdAt);
          to.setHours(23, 59, 59, 999);
          if (txnDate > to) matchesDate = false;
        }

        return matchesVehicle && matchesPayment && matchesDate && matchesWorker;
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return sortAsc ? dateA - dateB : dateB - dateA;
      });
  }, [
    transactions,
    searchVehicle,
    selectedPaymentType,
    selectedDate,
    workerSearch,
    fromDate,
    toDate,
    sortAsc,
  ]);

  const filteredTotalAmount = useMemo(() => {
    return sortedTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0
    );
  }, [sortedTransactions]);

  // Export PDF

  const handleExportPDF = () => {
    if (!sortedTransactions.length) {
      alert("No transactions to export");
      return;
    }

    // Table header
    const tableHeader = [
      { text: "Date & Time", style: "tableHeader" },
      { text: "Vehicle Number", style: "tableHeader" },
      { text: "Transaction Type", style: "tableHeader" },
      { text: "Payment Type", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
    ];

    // Table body
    const tableBody = sortedTransactions.map((t) => {
      const txnDate = t.createdAt ? new Date(t.createdAt) : null;
      const formattedDateTime = txnDate
        ? `${txnDate.getDate().toString().padStart(2, "0")}/${(
            txnDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}/${txnDate.getFullYear()} ${txnDate
            .getHours()
            .toString()
            .padStart(2, "0")}:${txnDate
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${txnDate
            .getSeconds()
            .toString()
            .padStart(2, "0")}`
        : "--";

      return [
        formattedDateTime,
        t.vehicleNumber,
        t.transactionType,
        t.paymentType,
        parseFloat(t.amount).toFixed(2),
      ];
    });

    // Add total row
    tableBody.push([
      "",
      "",
      "",
      { text: "Total", bold: true },
      { text: filteredTotalAmount.toFixed(2), bold: true },
    ]);

    const docDefinition = {
      pageOrientation: "portrait",
      pageSize: "A4",
      content: [
        { text: "Vehicle Transactions Report", style: "header" },

        {
          text: `Generated on: ${new Date().toLocaleString()}`,
          style: "subHeader",
        },

        // 👇 ADD THIS
        workerSearch
          ? { text: `Worker: ${workerSearch}`, style: "subHeader" }
          : {},

        searchVehicle
          ? { text: `Vehicle Number: ${searchVehicle}`, style: "subHeader" }
          : {},

        fromDate ? { text: `From Date: ${fromDate}`, style: "subHeader" } : {},

        toDate ? { text: `To Date: ${toDate}`, style: "subHeader" } : {},

        selectedPaymentType
          ? {
              text: `Payment Type: ${selectedPaymentType}`,
              style: "subHeader",
            }
          : {},

        { text: "\n" },

        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*", "*"],
            body: [tableHeader, ...tableBody],
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#34495E" : null),
          },
        },
      ],

      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        subHeader: { fontSize: 12, margin: [0, 2, 0, 4] },
        tableHeader: { bold: true, color: "white", fontSize: 12 },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`transactions_${searchVehicle || "all"}_${Date.now()}.pdf`);
  };
  const handlePreviewPDF = () => {
    if (!sortedTransactions.length) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "There are no transactions to preview.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const tableHeader = [
      { text: "Date & Time", style: "tableHeader" },
      { text: "Vehicle Number", style: "tableHeader" },
      { text: "Transaction Type", style: "tableHeader" },
      { text: "Payment Type", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
    ];

    const tableBody = sortedTransactions.map((t) => {
      const txnDate = t.createdAt ? new Date(t.createdAt) : null;
      const formattedDateTime = txnDate
        ? `${txnDate.getDate().toString().padStart(2, "0")}/${(
            txnDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}/${txnDate.getFullYear()} ${txnDate
            .getHours()
            .toString()
            .padStart(2, "0")}:${txnDate
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${txnDate
            .getSeconds()
            .toString()
            .padStart(2, "0")}`
        : "--";

      return [
        formattedDateTime,
        t.vehicleNumber,
        t.transactionType,
        t.paymentType,
        parseFloat(t.amount).toFixed(2),
      ];
    });

    tableBody.push([
      "",
      "",
      "",
      { text: "Total", bold: true },
      { text: filteredTotalAmount.toFixed(2), bold: true },
    ]);

    const docDefinition = {
      pageOrientation: "portrait",
      pageSize: "A4",
      content: [
        { text: "Vehicle Transactions Report", style: "header" },

        {
          text: `Generated on: ${new Date().toLocaleString()}`,
          style: "subHeader",
        },

        // 👇 ADD THIS
        workerSearch
          ? { text: `Worker: ${workerSearch}`, style: "subHeader" }
          : {},

        searchVehicle
          ? { text: `Vehicle Number: ${searchVehicle}`, style: "subHeader" }
          : {},

        fromDate ? { text: `From Date: ${fromDate}`, style: "subHeader" } : {},

        toDate ? { text: `To Date: ${toDate}`, style: "subHeader" } : {},

        selectedPaymentType
          ? {
              text: `Payment Type: ${selectedPaymentType}`,
              style: "subHeader",
            }
          : {},

        { text: "\n" },

        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*", "*"],
            body: [tableHeader, ...tableBody],
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#34495E" : null),
          },
        },
      ],

      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        subHeader: { fontSize: 12, margin: [0, 2, 0, 4] },
        tableHeader: { bold: true, color: "white", fontSize: 12 },
      },
    };

    pdfMake.createPdf(docDefinition).getBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setShowPdfPreview(true);
    });
  };

  // ✅ Load transports when page loads
  useEffect(() => {
    axios.get(`${API_URL}/api/transports/all`).then((res) => {
      setTransports(res.data);
    });
  }, []);

  // ✅ Save transport to DB
  const handleAddTransport = async () => {
    if (!transportName.trim() || !transportVehicle.trim()) return;

    await axios.post(`${API_URL}/api/transports/add`, {
      name: transportName,
      vehicle: transportVehicle,
    });

    // reload transport list after save
    const res = await axios.get(`${API_URL}/api/transports/all`);
    setTransports(res.data);

    setTransportName("");
    setTransportVehicle("");
  };

  // ✅ Remove ONLY the vehicle
  const removeTransport = async (name, vehicle) => {
    await axios.delete(`${API_URL}/api/transports/remove`, {
      params: { name, vehicle },
    });
    Swal.fire({
      icon: "success",
      title: "Vehicle Deleted!",
      text: `Vehicle ${newVehicleInput.trim()} deleted in ${currentTransportName}`,
      timer: 1800,
      showConfirmButton: false,
    });
    const res = await axios.get(`${API_URL}/api/transports/all`);
    setTransports(res.data);
  };

  // ✅ POPUP STATE
  const [showPopup, setShowPopup] = useState(false);
  const [selectedVehicleData, setSelectedVehicleData] = useState([]);

  const handleShowPopup = (vehicle) => {
    const filtered = transactions.filter((t) => t.vehicleNumber === vehicle);
    setSelectedVehicleData(filtered);
    setShowPopup(true);
  };
  const handleOpenAddVehiclePopup = (name) => {
    setCurrentTransportName(name);
    setNewVehicleInput("");
    setShowAddVehiclePopup(true);
  };
  const handleAddVehicleToTransport = async () => {
    if (!newVehicleInput.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Input",
        text: "Please enter a valid vehicle number before adding.",
        confirmButtonColor: "#0078ff",
      });
      return;
    }

    try {
      // Send directly to backend
      await axios.post(`${API_URL}/api/transports/add`, {
        name: currentTransportName,
        vehicle: newVehicleInput.trim(),
      });
      const res = await axios.get(`${API_URL}/api/transports/all`);
      setTransports(res.data);
      // Update frontend instantly
      setTransports((prev) => {
        const existing = prev.find((t) => t.name === currentTransportName);
        if (existing) {
          return prev.map((t) =>
            t.name === currentTransportName
              ? {
                  ...t,
                  vehicle: t.vehicle ? t.vehicle : "",
                  vehicles: [
                    ...new Set([...(t.vehicles || []), newVehicleInput]),
                  ],
                }
              : t
          );
        } else {
          return [
            ...prev,
            { name: currentTransportName, vehicles: [newVehicleInput] },
          ];
        }
      });
      Swal.fire({
        icon: "success",
        title: "Vehicle Added!",
        text: `Vehicle ${newVehicleInput.trim()} added to ${currentTransportName}`,
        timer: 1800,
        showConfirmButton: false,
      });
      setShowAddVehiclePopup(false);
      setNewVehicleInput("");
    } catch (err) {
      console.error("Error adding vehicle:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Add Vehicle",
        text:
          err.response?.data?.message ||
          "Something went wrong while adding the vehicle. Please try again.",
        confirmButtonColor: "#d33",
      });
    }
  };
  const handleTransportExportPDF = () => {
    if (!selectedVehicleData.length) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "This vehicle has no transactions.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const tableHeader = [
      { text: "Date & Time", style: "tableHeader" },
      { text: "Transaction Type", style: "tableHeader" },
      { text: "Payment Type", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
    ];

    const tableBody = selectedVehicleData.map((t) => {
      const txnDate = new Date(t.createdAt);
      const formatted = `${txnDate.getDate().toString().padStart(2, "0")}/${(
        txnDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${txnDate.getFullYear()} ${txnDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${txnDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${txnDate.getSeconds().toString().padStart(2, "0")}`;

      return [
        formatted,
        t.transactionType,
        t.paymentType,
        `₹${parseFloat(t.amount).toFixed(2)}`,
      ];
    });

    // Add total row
    tableBody.push([
      "",
      "",
      { text: "Total", bold: true },
      {
        text: `₹${selectedVehicleData
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
          .toFixed(2)}`,
        bold: true,
      },
    ]);

    const docDefinition = {
      pageOrientation: "portrait",
      pageSize: "A4",
      content: [
        { text: "Transport Vehicle Transactions", style: "header" },
        {
          text: `Vehicle: ${selectedVehicleData[0].vehicleNumber}`,
          style: "subHeader",
        },
        {
          text: `Generated on: ${new Date().toLocaleString()}`,
          style: "subHeader",
        },
        { text: "\n" },
        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*"],
            body: [tableHeader, ...tableBody],
          },
          layout: {
            fillColor: function (rowIndex) {
              return rowIndex === 0 ? "#34495E" : null;
            },
          },
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        subHeader: { fontSize: 12, margin: [0, 3, 0, 8] },
        tableHeader: { bold: true, fontSize: 12, color: "white" },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(
        `transport_${selectedVehicleData[0].vehicleNumber}_${Date.now()}.pdf`
      );
  };
  const handleResetFilters = () => {
    setSearchVehicle("");
    setWorkerSearch("");
    setSelectedPaymentType("");
    setFromDate("");
    setToDate("");
    setSuggestions([]);
    setSelectedVehicle(null);
    setPendingSuggestion(null);
    setHighlightVehicle(null);

    Swal.fire({
      icon: "success",
      title: "Reset Successful!",
      text: "All search filters have been cleared.",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  return (
    <div className="container mt-5 mb-2">
      {/* Search & Filters */}
      <div
        className="p-4 rounded shadow-lg mb-5"
        style={{ background: "#E8F6F3", transition: "all 0.3s ease" }}
      >
        <h2 className="fw-bold mb-3 align-items-center gap-2 text-black">
          <FaTruckLoading /> Add Transport
        </h2>

        <div className="d-flex flex-wrap gap-3">
          <input
            type="text"
            className="form-control form-control-lg"
            placeholder="Enter Transport Name"
            value={transportName}
            onChange={(e) => setTransportName(e.target.value)}
            required
          />

          <input
            type="text"
            className="form-control form-control-lg"
            placeholder="Enter Vehicle Number"
            value={transportVehicle}
            onChange={(e) => setTransportVehicle(e.target.value)}
            required
          />

          <button
            className="btn btn-primary btn-lg d-flex align-items-center gap-2 w-50 justify-content-center fw-bolder m-auto"
            onClick={handleAddTransport}
          >
            <FaPlus size={20} /> Add
          </button>
        </div>

        {transports.length > 0 ? (
          <table className="table table-bordered table-hover mt-4">
            <thead className="table-dark">
              <tr>
                <th>Transport Name</th>
                <th>Vehicle Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                transports.reduce((acc, item) => {
                  if (!acc[item.name]) acc[item.name] = [];
                  acc[item.name].push(item.vehicle);
                  return acc;
                }, {})
              ).map(([name, vehicles], i) => (
                <React.Fragment key={i}>
                  {vehicles.map((vehicle, index) => (
                    <tr key={index}>
                      {index === 0 && (
                        <td
                          rowSpan={vehicles.length}
                          className="fw-bold align-middle text-center"
                        >
                          {name}
                        </td>
                      )}
                      <td
                        className="fw-bold align-middle text-center"
                        style={{
                          cursor: "pointer",
                          color: "#0078ff",
                          textDecoration: "underline",
                        }}
                        onClick={() => handleShowPopup(vehicle)}
                      >
                        {vehicle}
                      </td>
                      <td className="text-center d-flex justify-content-center align-items-center">
                        <button
                          className="btn btn-outline-primary btn-sm m-2"
                          onClick={() => handleOpenAddVehiclePopup(name)}
                        >
                          <FaPlus />
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm m-2"
                          onClick={() => removeTransport(name, vehicle)}
                        >
                          <FaTrash size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center fw-bolder text-danger mt-4">
            NO TRANSPORTS ADDED!
          </p>
        )}

        {showAddVehiclePopup && (
          <div
            className="popup-overlay"
            onClick={(e) => {
              if (e.target.classList.contains("popup-overlay"))
                setShowAddVehiclePopup(false);
            }}
          >
            <div className="popup-card">
              <h4 className="fw-bold mb-3 text-center text-primary">
                Add Vehicle to{" "}
                <span className="text-dark">{currentTransportName}</span>
              </h4>
              <input
                type="text"
                className="form-control form-control-lg mb-3"
                placeholder="Enter vehicle number"
                value={newVehicleInput}
                onChange={(e) => setNewVehicleInput(e.target.value)}
                autoFocus
              />
              <div className="d-flex justify-content-center gap-3">
                <button
                  className="btn btn-success btn-lg px-4"
                  onClick={handleAddVehicleToTransport}
                >
                  Add
                </button>
                <button
                  className="btn btn-secondary btn-lg px-4"
                  onClick={() => setShowAddVehiclePopup(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showPopup && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
          >
            <div
              className="card p-4"
              style={{ width: "600px", maxHeight: "90vh", overflowY: "auto" }}
            >
              <h4 className="mb-3">Transaction Details</h4>
              {selectedVehicleData.length > 0 ? (
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Payment</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVehicleData.map((txn, i) => (
                      <tr key={i}>
                        <td>{new Date(txn.createdAt).toLocaleString()}</td>
                        <td>{txn.transactionType}</td>
                        <td>{txn.paymentType}</td>
                        <td>₹{txn.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No transactions found.</p>
              )}

              <div className="d-flex justify-content-between mt-3">
                {/* Export PDF Button */}
                <button
                  className="btn btn-danger me-3"
                  onClick={handleTransportExportPDF}
                >
                  <FaFilePdf className="me-2" />
                  Export PDF
                </button>

                {/* Close Button */}
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPopup(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <h2>Search Vehicle Number</h2>

      <div
        className="mb-4 position-relative mt-3 d-flex flex-column"
        ref={inputRef}
      >
        <div className="mb-4 position-relative mt-3 p-3 bg-light rounded shadow-sm">
          {/* Row 1 */}
          <div className="mb-3 mt-4">
            <label className="form-label fw-bold">
              <FaUserAlt className="mb-1 me-2 text-primary" />
              Search Worker
            </label>
            <input
              type="text"
              className="form-control form-control-lg shadow-sm"
              placeholder="Enter worker name..."
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
            />
          </div>
          <div className="d-flex flex-wrap mb-3 gap-3">
            <div
              className="flex-grow-1 position-relative"
              ref={vehicleWrapperRef}
              style={{ minWidth: 0 }}
            >
              <label className="form-label fw-bold d-flex align-items-center">
                <FaSearch className="me-2 text-primary" /> Vehicle Number
              </label>
              <input
                type="text"
                className="form-control form-control-lg shadow-sm"
                placeholder="Enter Vehicle Number..."
                value={searchVehicle}
                onChange={(e) => setSearchVehicle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter"}
                style={{ transition: "all 0.3s ease-in-out" }}
              />
              {searchVehicle && suggestions.length > 0 && (
                <ul
                  className="list-group position-absolute shadow-sm"
                  style={{
                    zIndex: 1000,
                    top: "calc(100% + 8px)",
                    left: 0,
                    width: "100%",
                    maxWidth: "400px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    borderRadius: "10px",
                  }}
                >
                  {suggestions.map((v, i) => (
                    <li
                      key={i}
                      className="list-group-item list-group-item-action"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSelectSuggestion(v)}
                    >
                      {v}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex-grow-1 position-relative">
              <label className="form-label fw-bold d-flex align-items-center">
                <FaMoneyBillAlt className="me-2 text-success" /> Payment Type
              </label>
              <select
                className="form-select form-select-lg shadow-sm"
                value={selectedPaymentType}
                onChange={(e) => setSelectedPaymentType(e.target.value)}
                style={{ transition: "all 0.3s ease-in-out" }}
              >
                <option value="">All Transactions</option>
                <option value="CASH">CASH</option>
                <option value="GPAY/PHONE PAY">GPAY/PHONE PAY</option>
                <option value="PENDING">PENDING</option>
                <option value="EXP">EXP</option>
              </select>
            </div>
          </div>

          <div className="d-flex flex-wrap mb-2 gap-3">
            {/* From Date */}
            <div className="flex-grow-1 position-relative">
              <label className="form-label fw-bold d-flex align-items-center">
                <FaCalendarAlt className="me-2 text-warning" /> From Date
              </label>
              <input
                type="date"
                className="form-control form-control-lg shadow-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* To Date */}
            <div className="flex-grow-1 position-relative">
              <label className="form-label fw-bold d-flex align-items-center">
                <FaCalendarAlt className="me-2 text-warning" /> To Date
              </label>
              <input
                type="date"
                className="form-control form-control-lg shadow-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate} // prevents selecting wrong range
              />
            </div>
          </div>
          <div className="flex-grow-1 d-flex justify-content-end mt-3">
            <button
              className="btn btn-info btn-lg w-100 d-flex align-items-center justify-content-center gap-2 shadow-lg mb-3"
              onClick={handlePreviewPDF}
            >
              <FaFilePdf /> Preview PDF
            </button>
          </div>
          <div className="flex-grow-1 d-flex justify-content-end ">
            {showPdfPreview && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 9999,
                }}
              >
                <div
                  style={{
                    width: "80%",
                    height: "90%",
                    background: "white",
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0px 0px 20px rgba(0,0,0,0.4)",
                    position: "relative",
                  }}
                >
                  {/* PDF Preview Frame */}
                  <iframe
                    src={pdfBlobUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                    title="PDF Preview"
                  ></iframe>
                  {/* Close Button */}
                  <button
                    onClick={() => setShowPdfPreview(false)}
                    style={{
                      position: "absolute",
                      bottom: "-10px",
                      right: "0px",
                      zIndex: 10000,
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <button
              className="btn btn-danger btn-lg w-100 d-flex align-items-center justify-content-center gap-2 shadow-lg"
              onClick={handleExportPDF}
              style={{ transition: "transform 0.2s, box-shadow 0.3s" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <FaFilePdf /> Export PDF
            </button>
          </div>
          <button
            className="btn btn-secondary btn-lg w-100 mt-2 d-flex align-items-center justify-content-center gap-2 shadow"
            onClick={handleResetFilters}
            style={{ transition: "transform 0.2s, box-shadow 0.3s" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            🔄 Reset
          </button>
        </div>
      </div>
      {/* Transactions Table */}
      <h2 className="mt-4">
        Transactions for <span>{searchVehicle || "All Vehicles"}</span>
        {selectedPaymentType && (
          <span className="text-primary"> ({selectedPaymentType})</span>
        )}
      </h2>
      <div
        style={{
          maxHeight: "100vh",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        {sortedTransactions.length === 0 ? (
          <div className="text-center fw-bolder text-danger py-4 fs-5">
            TRANSACTIONS NOT FOUND!
          </div>
        ) : (
          <table
            className="table table-bordered table-hover mb-0"
            ref={tableRef}
          >
            <thead
              className="table-dark position-sticky top-0"
              style={{ zIndex: 10 }}
            >
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  Date & Time {sortAsc ? "↑" : "↓"}
                </th>
                <th>Vehicle Number</th>
                <th>Transaction Type</th>
                <th>Payment Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((t, i) => {
                const txnDate = t.createdAt ? new Date(t.createdAt) : null;
                const formattedDateTime = txnDate
                  ? `${txnDate.getDate().toString().padStart(2, "0")}/${(
                      txnDate.getMonth() + 1
                    )
                      .toString()
                      .padStart(2, "0")}/${txnDate.getFullYear()} ${txnDate
                      .getHours()
                      .toString()
                      .padStart(2, "0")}:${txnDate
                      .getMinutes()
                      .toString()
                      .padStart(2, "0")}:${txnDate
                      .getSeconds()
                      .toString()
                      .padStart(2, "0")}`
                  : "--";

                const isToday =
                  txnDate &&
                  txnDate.toDateString() === new Date().toDateString();
                return (
                  <tr
                    key={i}
                    className={isToday ? "table-success fw-bold" : ""}
                    data-vehicle={t.vehicleNumber?.toLowerCase()}
                  >
                    <td>{formattedDateTime}</td>
                    <td>{t.vehicleNumber}</td>
                    <td>{t.transactionType}</td>
                    <td>{t.paymentType}</td>
                    <td>{parseFloat(t.amount).toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan="4" className="text-end fw-bold">
                  Total
                </td>
                <td className="fw-bold">{filteredTotalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
      <h2 className="mt-5">Worker Login Details</h2>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        <table className="table table-bordered table-hover mb-4">
          <thead className="table-dark">
            <tr>
              <th>Worker</th>
              <th>Shift Type</th>
              <th>Login Time</th>
              <th>Shift Close Time</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center text-danger fw-bold">
                  No shift records found
                </td>
              </tr>
            ) : (
              records.map((s, i) => (
                <tr key={i}>
                  <td>{s.worker}</td>
                  <td>
                    <span
                      className={`badge ${
                        s.shiftType === "DAY" ? "bg-primary" : "bg-dark"
                      }`}
                      style={{ fontSize: "1rem" }}
                    >
                      {s.shiftType || "N/A"}
                    </span>
                  </td>
                  <td>
                    {s.loginTime
                      ? new Date(s.loginTime).toLocaleString()
                      : "--"}
                  </td>
                  <td>
                    {s.shiftCloseTime
                      ? new Date(s.shiftCloseTime).toLocaleString()
                      : "--"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
