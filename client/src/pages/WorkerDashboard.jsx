import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function WorkerDashboard({ worker }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [pendingAmount, setPendingAmount] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [allVehicles, setAllVehicles] = useState([]);
  const initialBanks = [
    { name: "AXIS BANK", account: "3447", balance: "", submitted: false },
    { name: "AXIS BANK", account: "1531", balance: "", submitted: false },
    { name: "IDFC FIRST BANK", account: "6006", balance: "", submitted: false },
    { name: "INDUSIND BANK", account: "6006", balance: "", submitted: false },
    { name: "SBI BANK", account: "6006", balance: "", submitted: false },
    { name: "CASH", balance: "", submitted: false },
  ];
  const [banks, setBanks] = useState(
    JSON.parse(localStorage.getItem("banks")) || initialBanks
  );
  const [transactions, setTransactions] = useState(
    JSON.parse(localStorage.getItem("transactions")) || []
  );
  const [pendingBalance, setPendingBalance] = useState(
    JSON.parse(localStorage.getItem("pendingBalance")) || 0
  );

  const [transactionForm, setTransactionForm] = useState({
    vehicleNumber: "",
    transactionType: "",
    amount: "",
    paymentType: "",
  });
  const [payAmount, setPayAmount] = useState("");

  const transactionOptions = [
    "IDFC FIRST BANK",
    "STATE BANK OF INDIA(SBI)",
    "AIRTEL PAYMENTS BANK",
    "ICICI BANK",
    "INDUSIND BANK",
    "KOTAK MAHINDRA BANK",
    "EQUITAS BANK",
    "AXIS BANK",
    "HDFC BANK",
    "BANK OF BARODA",
    "IDBI BANK",
    "FEDRAL BANK",
    "BAJAJ PAY",
    "LIVQUIK FASTAG",
    "OTHERS FASTAG",
    "PENDING",
    "CASH",
  ];

  const paymentOptions = ["CASH", "GPAY/PHONE PAY", "PENDING", "EXP"];

  // save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("banks", JSON.stringify(banks));
  }, [banks]);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("pendingBalance", JSON.stringify(pendingBalance));
  }, [pendingBalance]);

  const handleBankChange = (index, field, value) => {
    const updated = [...banks];
    updated[index][field] = value;
    setBanks(updated);
  };

  const submitBank = (index) => {
    const updated = [...banks];
    updated[index].submitted = true;
    setBanks(updated);
  };

  const handleTransactionChange = (e) => {
    setTransactionForm({ ...transactionForm, [e.target.name]: e.target.value });
  };
  useEffect(() => {
    axios
      .get("https://vettai-fastag.onrender.com/api/transactions/all")
      .then((res) => {
        // get unique vehicle numbers
        const vehicles = [...new Set(res.data.map((t) => t.vehicleNumber))];

        // only keep vehicles with pending amount > 0
        const pendingVehicles = vehicles.filter((v) => {
          const vehicleTxns = res.data.filter(
            (t) => t.vehicleNumber?.toLowerCase() === v.toLowerCase()
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
          return pendingTotal > 0; // only vehicles with pending
        });

        setAllVehicles(pendingVehicles); // store pending vehicles
      })
      .catch((err) => console.error(err));
  }, []);

  const addTransaction = async (e) => {
    e.preventDefault();

    try {
      const txVehicle = transactionForm.vehicleNumber || vehicleNumber;
      if (!txVehicle) {
        Swal.fire({
          icon: "warning",
          title: "Enter Vehicle Number",
          text: "Please enter the vehicle number before adding a transaction.",
          timer: 3000,
          showConfirmButton: false,
          position: "top-center",
          toast: true,
        });
        return;
      }

      const worker = localStorage.getItem("username") || "Worker1";
      const newTx = { ...transactionForm, vehicleNumber: txVehicle, worker };

      // Add transaction to backend
      await axios.post(
        "https://vettai-fastag.onrender.com/api/transactions/add",
        newTx
      );

      // Only show popup if transaction type is "PENDING"
      if (transactionForm.transactionType.toUpperCase() === "PENDING") {
        const prevPending = pendingAmount || 0;
        const newPending =
          prevPending - parseFloat(transactionForm.amount || 0);

        // Update pendingAmount state
        setPendingAmount(newPending > 0 ? newPending : 0);

        // Update dropdown suggestions for this vehicle
        setSuggestions((prev) =>
          prev.map((item) =>
            item.vehicle === txVehicle
              ? { ...item, pending: newPending > 0 ? newPending : 0 }
              : item
          )
        );

        // Show remaining pending popup
        Swal.fire({
          icon: "success",
          title: `₹${transactionForm.amount} collected from ${txVehicle}`,
          text: `Remaining pending balance: ₹${newPending.toFixed(2)}`,
          position: "top-center",
          toast: true,
          timer: 3000,
          showConfirmButton: false,
        });
      }

      // Update transactions locally
      setTransactions([...transactions, newTx]);

      // Reset form & input states
      setTransactionForm({
        vehicleNumber: "",
        transactionType: "",
        amount: "",
        paymentType: "",
      });
      setVehicleNumber("");
      setPendingAmount(null);
      setSelectedVehicle(null);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Failed to Add Transaction",
        text: "Something went wrong. Please try again.",
        position: "top-center",
        toast: true,
        timer: 5000,
        showConfirmButton: false,
      });
    }
  };

  const totalAmount = transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount || 0),
    0
  );
  const handleConfirmLogout = async () => {
    try {
      const worker = localStorage.getItem("username");
      const logoutTime = new Date().toISOString();

      await axios.post(
        "https://vettai-fastag.onrender.com/api/auth/workers/logout",
        {
          worker,
          logoutTime,
        }
      );
      localStorage.removeItem("token");
      localStorage.removeItem("username");

      navigate("/worker/login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };
  const defaultTotals = {
    CASH: 0,
    "GPAY/PHONE PAY": 0,
    PENDING: 0,
    EXP: 0,
  };

  // get starting cash entered by worker once
  const startingCash = parseFloat(
    banks.find((b) => b.name === "CASH")?.balance || 0
  );

  const totalsByPaymentType = transactions.reduce(
    (acc, t) => {
      const amt = parseFloat(t.amount || 0);
      if (
        t.transactionType === "PENDING" &&
        ["GPAY/PHONE PAY", "PENDING", "EXP"].includes(t.paymentType)
      ) {
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
  totalsByPaymentType["CASH"] += startingCash;

  const computedCashBalance = transactions.reduce((cash, t) => {
    const amt = parseFloat(t.amount || 0);

    if (
      t.transactionType === "CASH" &&
      ["GPAY/PHONE PAY", "PENDING", "EXP"].includes(t.paymentType)
    ) {
      // subtract from cash
      return cash - amt;
    } else if (t.paymentType === "CASH") {
      // add to cash if payment is cash
      return cash + amt;
    }

    return cash;
  }, parseFloat(startingCash || 0));

  // fetch all vehicle numbers for suggestions
  useEffect(() => {
    axios
      .get("https://vettai-fastag.onrender.com/api/transactions/all")
      .then((res) => {
        const vehicles = [...new Set(res.data.map((t) => t.vehicleNumber))];
        setSuggestions(vehicles);
      });
  }, []);

  // fetch pending amount when vehicle changes

  // Fetch pending vehicles on mount
  useEffect(() => {
    axios
      .get("https://vettai-fastag.onrender.com/api/transactions/all")
      .then((res) => {
        const vehicles = [...new Set(res.data.map((t) => t.vehicleNumber))];

        // keep only vehicles with pending > 0
        const pendingVehicles = vehicles.filter((v) => {
          const vehicleTxns = res.data.filter(
            (t) => t.vehicleNumber?.toLowerCase() === v.toLowerCase()
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
          return pendingTotal > 0;
        });

        setAllVehicles(pendingVehicles);
      })
      .catch((err) => console.error(err));
  }, []);
  const handleVehicleChange = (val) => {
    setVehicleNumber(val);
    setSelectedVehicle(null);
    setPendingAmount(null);

    if (val.length >= 1) {
      // Filter vehicles by the typed value
      const filtered = allVehicles.filter((v) =>
        v?.toLowerCase().includes(val.toLowerCase())
      );

      // Fetch pending amount for each filtered vehicle
      Promise.all(
        filtered.map(async (vehicle) => {
          try {
            const res = await axios.get(
              `https://vettai-fastag.onrender.com/api/transactions/pending/${vehicle}`
            );
            return { vehicle, pending: parseFloat(res.data.totalPending) || 0 };
          } catch {
            return { vehicle, pending: 0 };
          }
        })
      ).then((results) => {
        console.log("Dropdown suggestions:", results); // ✅ debug
        setSuggestions(results); // Set all filtered vehicles with their pending
      });
    } else {
      // If input is empty, show all vehicles with pending amounts
      Promise.all(
        allVehicles.map(async (vehicle) => {
          try {
            const res = await axios.get(
              `https://vettai-fastag.onrender.com/api/transactions/pending/${vehicle}`
            );
            return { vehicle, pending: parseFloat(res.data.totalPending) || 0 };
          } catch {
            return { vehicle, pending: 0 };
          }
        })
      ).then((results) => setSuggestions(results));
    }
  };

  const handleSelectSuggestion = (vehicle) => {
    setVehicleNumber(vehicle);
    setSelectedVehicle(vehicle);
    setTransactionForm((prev) => ({ ...prev, vehicleNumber: vehicle })); // keep in sync
    setSuggestions([]);

    axios
      .get(
        `https://vettai-fastag.onrender.com/api/transactions/pending/${vehicle}`
      )
      .then((res) => setPendingAmount(res.data.totalPending || 0))
      .catch(() => setPendingAmount(0));
  };

  // Filter transactions for selected vehicle
  const displayedTransactions = selectedVehicle
    ? transactions.filter(
        (t) => t.vehicleNumber?.toLowerCase() === selectedVehicle.toLowerCase()
      )
    : transactions;
  const handleShiftClose = async () => {
    try {
      const worker = localStorage.getItem("username");
      const closedTime = new Date().toISOString();
      const logoutTime = new Date().toISOString();

      await axios.post(
        "https://vettai-fastag.onrender.com/api/auth/workers/shiftclose",
        {
          worker,
          logoutTime,
          closedTime,
        }
      );

      localStorage.removeItem("token");
      localStorage.removeItem("username");

      Swal.fire({
        icon: "success",
        title: "Shift Closed Successfully",
        text: "Your shift has been closed and recorded.",
        timer: 3000,
        showConfirmButton: false,
        position: "top-center",
        toast: true,
      });

      navigate("/worker/login");
    } catch (err) {
      console.error("Error closing shift:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Close Shift",
        text: "Something went wrong. Please try again.",
        timer: 3000,
        showConfirmButton: false,
        position: "top-center",
        toast: true,
      });
    }
  };
  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-end mb-3">
        <button
          className="btn btn-danger mx-3"
          onClick={() => setShowLogoutModal(true)}
        >
          Logout
        </button>
        <button
          className="btn btn-warning"
          onClick={() => setShowLogoutModal("shift")}
        >
          Shift Close
        </button>
      </div>
      <h2>Worker Dashboard</h2>
      {showLogoutModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {showLogoutModal === "shift"
                    ? "Confirm Shift Close"
                    : "Confirm Logout"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLogoutModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  {showLogoutModal === "shift"
                    ? "Are you sure you want to close this shift?"
                    : "Are you sure you want to logout?"}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${
                    showLogoutModal === "shift" ? "btn-warning" : "btn-danger"
                  }`}
                  onClick={() =>
                    showLogoutModal === "shift"
                      ? handleShiftClose()
                      : handleConfirmLogout()
                  }
                >
                  {showLogoutModal === "shift" ? "Close Shift" : "Logout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Bank Balances */}
      <h4 className="mt-4">Bank Balances</h4>
      <div className="row">
        {banks.map((bank, i) => (
          <div className="col-md-4 mb-3" key={i}>
            <div className="card p-3">
              <h5>{bank.name}</h5>
              {bank.name === "CASH" ? (
                bank.submitted ? (
                  <p>
                    <strong>Balance:</strong> ₹{bank.balance}
                  </p>
                ) : (
                  <>
                    <input
                      type="number"
                      className="form-control mb-2"
                      placeholder="Balance"
                      value={bank.balance}
                      onChange={(e) =>
                        handleBankChange(i, "balance", e.target.value)
                      }
                    />
                    <button
                      className="btn btn-success btn-sm w-100"
                      onClick={() => submitBank(i)}
                    >
                      Save
                    </button>
                  </>
                )
              ) : bank.submitted ? (
                <div>
                  <p>
                    <strong>Balance:</strong> {bank.balance}
                  </p>
                </div>
              ) : (
                <>
                  {bank.account && (
                    <p>
                      <strong>Account NO:</strong> {bank.account}
                    </p>
                  )}
                  <input
                    type="number"
                    className="form-control mb-2"
                    placeholder="Balance"
                    value={bank.balance}
                    onChange={(e) =>
                      handleBankChange(i, "balance", e.target.value)
                    }
                  />
                  <button
                    className="btn btn-success btn-sm w-100"
                    onClick={() => submitBank(i)}
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <h4 className="mt-4">Totals by Payment Type</h4>
      <table className="table table-bordered w-50">
        <thead>
          <tr>
            <th>Payment Type</th>
            <th>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(totalsByPaymentType).map(([type, amt]) => (
            <tr key={type}>
              <td>{type}</td>
              <td>₹{amt.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Transaction Form */}
      <h4 className="mt-4">Add Transaction</h4>
      <form onSubmit={addTransaction} className="mb-4">
        <div className="row col-md-12 p-3">
          <div className="col-md-3 mb-2">
            <div className="mb-2 position-relative">
              <input
                type="text"
                className="form-control"
                placeholder="Enter Vehicle Number..."
                value={vehicleNumber}
                onChange={(e) => handleVehicleChange(e.target.value)}
              />
              {vehicleNumber && (
                <div
                  className={`mt-2 fw-bold ${
                    pendingAmount > 0 ? "text-danger" : "text-success"
                  }`}
                >
                  Pending Amount: ₹{(pendingAmount ?? 0).toFixed(2)}
                </div>
              )}

              {vehicleNumber && suggestions.length > 0 && (
                <ul
                  className="list-group position-absolute w-100"
                  style={{
                    zIndex: 2000,
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {suggestions
                    .filter((item) => item.pending > 0)
                    .map((item, i) => (
                      <li
                        key={i}
                        className="list-group-item list-group-item-action d-flex justify-content-between"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSelectSuggestion(item.vehicle)}
                      >
                        <span>{item.vehicle}</span>
                        <span
                          className={
                            item.pending > 0
                              ? "text-danger fw-bold"
                              : "text-success fw-bold"
                          }
                        >
                          ₹{Number(item.pending || 0).toFixed(2)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <datalist id="vehicleSuggestions">
              {[...new Set(transactions.map((t) => t.vehicleNumber))].map(
                (v, i) => (
                  <option key={i} value={v} />
                )
              )}
            </datalist>
          </div>
          <div className="col-md-3 mb-2">
            <select
              className="form-control"
              name="transactionType"
              value={transactionForm.transactionType}
              onChange={handleTransactionChange}
              required
            >
              <option value="">Select Transaction Type</option>
              {transactionOptions.map((opt, i) => (
                <option
                  key={i}
                  value={opt}
                  disabled={
                    opt.toUpperCase() === "PENDING" &&
                    (!pendingAmount || pendingAmount <= 0)
                  }
                >
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2 mb-2">
            <input
              type="number"
              className="form-control"
              placeholder="Amount"
              name="amount"
              value={transactionForm.amount}
              onChange={handleTransactionChange}
              required
            />
          </div>
          <div className="col-md-2 mb-2">
            <select
              className="form-control"
              name="paymentType"
              value={transactionForm.paymentType}
              onChange={handleTransactionChange}
              required
            >
              <option value="">Select Payment Type</option>
              {paymentOptions.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2 mb-2">
            <button className="btn btn-primary w-20" type="submit">
              Add Transaction
            </button>
          </div>
        </div>
      </form>

      {/* Transaction Table */}
      <h4>Transactions</h4>
      <table className="table table-bordered mb-5 mt-2">
        <thead>
          <tr>
            <th>Vehicle Number</th>
            <th>Transaction Type</th>
            <th>Payment Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i}>
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
            <td className="fw-bold">{totalAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
