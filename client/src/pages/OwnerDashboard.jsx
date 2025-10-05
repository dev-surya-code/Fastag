import { useEffect, useRef, useState } from "react";
import axios from "axios";

export default function OwnerDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [records, setRecords] = useState([]);
  const [searchVehicle, setSearchVehicle] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState("");
  const [highlightVehicle, setHighlightVehicle] = useState(null);
  const tableRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    axios
      .get(
        "https://vettai-fastag.onrender.com/api/auth/owner/activities"
      )
      .then((res) => setRecords(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await axios.get(
          "https://vettai-fastag.onrender.com/api/transactions/all"
        );
        setTransactions(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Totals by Payment Type
  const defaultTotals = { CASH: 0, "GPAY/PHONE PAY": 0, PENDING: 0, EXP: 0 };
  const totalsByPaymentType = transactions.reduce(
    (acc, t) => {
      const amt = parseFloat(t.amount || 0);
      if (
        t.transactionType === "PENDING" &&
        ["GPAY/PHONE PAY", "PENDING", "EXP"].includes(t.paymentType)
      ) {
        acc["PENDING"] -= amt; // subtract from cash
        acc[t.paymentType] += amt;
      } else {
        if (acc[t.paymentType] !== undefined) {
          acc[t.paymentType] += amt;
        } else {
          acc[t.paymentType] = amt;
        }
      }
      return acc;
    },
    { ...defaultTotals }
  );

  const totalAmount = transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount || 0),
    0
  );

  const paymentOrder = ["CASH", "PENDING", "GPAY/PHONE PAY", "EXP"];

  const calculatePendingForVehicle = (vehicleNumber) => {
    const vehicleTxns = transactions.filter(
      (t) =>
        t.vehicleNumber &&
        t.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase()
    );

    let pendingTotal = 0;
    vehicleTxns.forEach((t) => {
      const amt = parseFloat(t.amount || 0);
      if (
        t.transactionType === "PENDING" &&
        t.paymentType === "GPAY/PHONE PAY"
      ) {
        pendingTotal -= amt;
      } else if (t.paymentType === "PENDING") {
        pendingTotal += amt;
      }
    });

    return pendingTotal;
  };

  useEffect(() => {
    if (searchVehicle.trim() === "") {
      setSuggestions([]);
      setPendingSuggestion(null);
      setSelectedVehicle(null);
      return;
    }

    const vehicleNumbers = [
      ...new Set(transactions.map((t) => t.vehicleNumber)),
    ];

    // filter vehicles that match search + have pending > 0
    const filtered = vehicleNumbers.filter((v) => {
      if (!v) return false;
      const pending = calculatePendingForVehicle(v);
      return (
        v.toLowerCase().includes(searchVehicle.toLowerCase()) && pending > 0
      );
    });

    setSuggestions(filtered);

    // exact match check
    const exactMatch = filtered.find(
      (v) => v?.toLowerCase() === searchVehicle.toLowerCase()
    );
    if (exactMatch) {
      setPendingSuggestion(calculatePendingForVehicle(exactMatch));
      setSelectedVehicle(exactMatch);
    } else {
      setPendingSuggestion(null);
      setSelectedVehicle(null);
    }
  }, [searchVehicle, transactions]);

  const handleSelectSuggestion = (vehicle) => {
    setSearchVehicle(vehicle);
    setSuggestions([]);
    setPendingSuggestion(calculatePendingForVehicle(vehicle));
    setSelectedVehicle(vehicle);
  };
  useEffect(() => {
    if (searchVehicle.trim() === "") {
      setSuggestions([]);
      return;
    }

    const vehicleNumbers = [
      ...new Set(
        transactions
          .map((t) => t.vehicleNumber)
          .filter(
            (v) => v && v.toLowerCase().includes(searchVehicle.toLowerCase())
          )
      ),
    ];

    setSuggestions(vehicleNumbers);
  }, [searchVehicle, transactions]);

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

  // Filtered transactions dynamically
  const filteredTransactions = transactions.filter((t) => {
    const matchesVehicle =
      searchVehicle.trim() === "" ||
      (t.vehicleNumber &&
        t.vehicleNumber.toLowerCase().includes(searchVehicle.toLowerCase()));
    const matchesPayment =
      selectedPaymentType === "" || t.paymentType === selectedPaymentType;
    return matchesVehicle && matchesPayment;
  });

  const filteredTotalAmount = filteredTransactions.reduce(
    (sum, t) => sum + parseFloat(t.amount || 0),
    0
  );

  // Auto-scroll to selected vehicle after clicking suggestion
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
  return (
    <div className="container mt-5">
      {/* Vehicle Pending Suggestion */}
      <div className="mb-4 position-relative">
        <h2>Search Vehicle Number</h2>
        <div className="d-flex col-lg-8">
          <input
            type="text"
            className="form-control w-50 mx-4"
            placeholder="Enter Vehicle Number..."
            value={searchVehicle}
            onChange={(e) => setSearchVehicle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSuggestions([]);
            }}
          />
          <select
            className="form-select w-50"
            value={selectedPaymentType}
            onChange={(e) => setSelectedPaymentType(e.target.value)}
          >
            <option value="">All Transactions</option>
            <option value="CASH">CASH</option>
            <option value="GPAY/PHONE PAY">GPAY/PHONE PAY</option>
            <option value="PENDING">PENDING</option>
            <option value="EXP">EXP</option>
          </select>
        </div>

        {/* Show only vehicle numbers */}
        {searchVehicle && suggestions.length > 0 && (
          <ul
            className="list-group position-absolute w-50 mt-1 shadow-sm fade-in"
            style={{
              zIndex: 1000,
              maxWidth: "400px",
              marginLeft: "25px",
              maxHeight: "200px",
              overflowY: "auto",
              borderRadius: "10px",
            }}
          >
            {suggestions.map((v, i) => (
              <li
                key={i}
                className="list-group-item list-group-item-action"
                style={{ cursor: "pointer", transition: "0.2s" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#cce9ffff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "white")
                }
                onClick={() => {
                  setSearchVehicle(v);
                  setSuggestions([]);
                  setHighlightVehicle(v);
                }}
              >
                {v}
              </li>
            ))}
          </ul>
        )}

        {pendingSuggestion !== null && (
          <div className="mt-2 fw-bold mx-4">
            Pending Amount for{" "}
            <span className="text-primary">{searchVehicle}</span>:{" "}
            <span
              className={pendingSuggestion < 0 ? "text-danger" : "text-success"}
            >
              ₹{pendingSuggestion.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Worker Login/Logout Records */}
      <h2>Worker Login Details</h2>
      <table className="table table-bordered mt-3">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Login Time</th>
            <th>Logout Time</th>
            <th>Shift Closed Time</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i}>
              <td>{r.worker}</td>
              <td>{new Date(r.loginTime).toLocaleString()}</td>
              <td>
                {r.logoutTime ? (
                  new Date(r.logoutTime).toLocaleString()
                ) : (
                  <span className="fw-bold">--</span>
                )}
              </td>
              <td>
                {r.shiftCloseTime ? (
                  new Date(r.shiftCloseTime).toLocaleString()
                ) : (
                  <span className=" text-success fw-bold">Active</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Transaction Details */}

      <h2 className="mt-4">
        Transactions for <span>{searchVehicle || "All Vehicles"}</span>
        <span className="text-primary">
          {selectedPaymentType ? ` (${selectedPaymentType})` : ""}
        </span>
      </h2>

      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Vehicle Number</th>
            <th>Transaction Type</th>
            <th>Payment Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map((t, i) => (
            <tr
              key={i}
              className={
                selectedVehicle &&
                t.vehicleNumber?.toLowerCase() === selectedVehicle.toLowerCase()
                  ? "table-warning"
                  : ""
              }
            >
              <td>{t.vehicleNumber}</td>
              <td>{t.transactionType}</td>
              <td>{t.paymentType}</td>
              <td>{parseFloat(t.amount).toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan="3" className="text-end fw-bold">
              Total
            </td>
            <td className="fw-bold">{filteredTotalAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
