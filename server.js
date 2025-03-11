const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;





app.use(cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"], // Allows all origins (for testing only)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.options('*', cors());



// app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,"public")));

// Connect to SQLite database
const db = new sqlite3.Database("users.db", (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the database.");
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                balance REAL DEFAULT 100.00
            )
        `);
    }
});

// Signup API (Register New Users)
app.post("/signup", (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "Server error." });
        if (row) return res.json({ success: false, message: "Username already taken!" });

        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function (err) {
            if (err) return res.status(500).json({ success: false, message: "Error saving user." });
            res.json({ success: true, message: "Signup successful!", userId: this.lastID });
        });
    });
});

// Login API (Check Username & Password)
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "Server error." });
        if (row) {
            res.json({ success: true, message: "Login successful!", username, userId: row.id });
        } else {
            res.json({ success: false, message: "Invalid username or password." });
        }
    });
});

//save for later
// // Get balance (for authenticated users)
// app.get("/balance/:username", (req, res) => {
//     const { username } = req.params;

//     db.get("SELECT balance FROM users WHERE username = ?", [username], (err, user) => {
//         if (err || !user) {
//             return res.status(400).json({ message: "User not found." });
//         }

//         res.json({ balance: user.balance });
//     });
// });
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
})
// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
