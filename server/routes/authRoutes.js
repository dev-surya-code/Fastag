import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Worker from "../models/Worker.js";
import Owner from "../models/Owner.js";
import Activity from "../models/Activity.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_default_secret";

// Worker Signup
router.post("/worker/signup", async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    if (!username || !password || !confirmPassword)
      return res.status(400).json({ msg: "All fields are required" });
    if (password !== confirmPassword)
      return res.status(400).json({ msg: "Passwords do not match" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ msg: "Password should be at least 6 characters" });

    const existing = await Worker.findOne({ username });
    if (existing)
      return res.status(400).json({ msg: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const worker = new Worker({ username, password: hashed });
    await worker.save();

    res.json({ msg: "Worker registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Worker Login
router.post("/worker/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ msg: "Username and password are required" });
  }
  try {
    const worker = await Worker.findOne({ username });
    if (!worker) return res.status(400).json({ msg: "Worker not found" });
    if (!worker.password)
      return res.status(500).json({ msg: "Worker has no password set" });

    const isMatch = await bcrypt.compare(password, worker.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const loginTime = new Date();
    worker.lastLogin = loginTime;
    await worker.save();

    await Activity.create({ worker: worker.username, loginTime });

    const token = jwt.sign({ id: worker._id, role: "worker" }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token, msg: "Worker login success", loginTime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
});

// Worker Logout
router.post("/workers/logout", async (req, res) => {
  try {
    const { worker, logoutTime } = req.body;

    if (!worker) {
      return res.status(400).json({ msg: "Worker is required" });
    }

    const parsedDate = new Date(logoutTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ msg: "Invalid logout time received" });
    }

    const activity = await Activity.findOne({
      worker,
      logoutTime: null, // find active session
    }).sort({ loginTime: -1 });

    if (!activity) {
      return res.status(404).json({ msg: "No active login found" });
    }

    activity.logoutTime = parsedDate; // ✅ safe to assign
    await activity.save();

    return res.json({ msg: "Logout recorded", activity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
});
// Get Worker Logs
router.get("/workers/logs", async (req, res) => {
  // <-- added leading /
  try {
    const logs = await Activity.find().sort({ loginTime: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Owner Login
router.post("/owner/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ msg: "All fields are required" });

    const owner = await Owner.findOne({ username });
    if (!owner) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: owner._id, role: "owner" }, JWT_SECRET, {
      expiresIn: "2h",
    });
    res.json({ token, role: "owner", username: owner.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
router.post("/workers/shiftclose", async (req, res) => {
  try {
    const { worker, closedTime, logoutTime } = req.body;
    const parsedDate = new Date(closedTime);
    const logoutParsedDate = new Date(logoutTime);
    if (!worker || !closedTime)
      return res.status(400).json({ message: "Missing worker or closedTime" });
    if (isNaN(logoutParsedDate.getTime())) {
      return res.status(400).json({ msg: "Invalid logout time received" });
    }
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ msg: "Invalid Shift close time received" });
    }
    const activity = await Activity.findOneAndUpdate({
      worker,
      logoutTime: null,
      shiftCloseTime: null,
    }).sort({ loginTime: -1 });
    activity.logoutTime = logoutParsedDate; // ✅ safe to assign
    await activity.save();
    activity.shiftCloseTime = parsedDate; // ✅ safe to assign
    await activity.save();
    if (!activity)
      return res
        .status(404)
        .json({ message: "No active shift found for this worker" });

    res.json({ message: "Shift closed successfully", record: activity });
  } catch (err) {
    console.error("Shift Close Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Owner Dashboard API - get all worker login activities
router.get("/owner/activities", async (req, res) => {
  try {
    const records = await Activity.find().sort({ loginTime: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

export default router;
