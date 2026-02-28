const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000", 
      "https://fund-manager-six.vercel.app",
      "https://moneymanager-1k8t.onrender.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors()); // Handle preflight OPTIONS requests
app.use(express.json());
app.use(cookieParser());

// MongoDB Atlas Connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;
async function connectDB() {
  try {
    await client.connect();
    db = client.db("mydb");
    console.log("Connected to MongoDB Atlas.");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}
connectDB();

const JWT_SECRET = process.env.JWT_SECRET || "first_project_fullstack";

// Authentication Middleware
const verifyToken = (req, res, next) => {
  // Accept token from either an httpOnly cookie or the Authorization header.
  let token = req.cookies && req.cookies.jwt_token;
  if (!token && req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }

  console.log("verifyToken - Token present:", !!token);
  console.log("verifyToken - Token value:", token ? token.substring(0, 20) + "..." : "none");
  console.log("verifyToken - JWT_SECRET:", JWT_SECRET);

  if (!token) return res.status(401).json({ error: "Unauthorized, No Token" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err.message);
      return res.status(401).json({ error: "Unauthorized, Invalid Token" });
    }
    console.log("Token decoded successfully:", decoded);
    req.user = decoded;
    next();
  });
};

// User Registration
app.post("/register", async (req, res) => {
  console.log("Register request received:", req.body);
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("Validation failed: Invalid email");
    return res.status(400).json({ error: "Please enter a valid email with @" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", email);
      return res.status(400).json({ error: "User already exists" });
    }

    console.log("Inserting new user:", { username, email });
    await usersCollection.insertOne({
      username,
      email,
      password: hashedPassword,
    });
    console.log("User registered successfully");
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

// User Login
app.post("/login", async (req, res) => {
  console.log("Login request received:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "Email and password are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("Validation failed: Invalid email");
    return res.status(400).json({ error: "Please enter a valid email with @" });
  }

  try {
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.log("User not found:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Invalid password for:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("jwt_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      path: "/",
    });
    console.log(
      "Cookie set for user:",
      email,
      "Token:",
      token.substring(0, 20) + "..."
    );
    console.log("Login successful for:", email);
    res.json({
      message: "Login successful",
      token,
      userId: user._id.toString(),
      username: user.username,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// User Logout
app.post("/logout", (req, res) => {
  // Clear the cookie using the same options used to set it (secure depends on env)
  res.cookie("jwt_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
    path: "/",
    expires: new Date(0),
  });
  res.json({ message: "Logged out successfully" });
});

// Get Transactions
app.get("/transaction", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log("Fetching transactions for user:", userId);
    const transactionsCollection = db.collection("transaction");
    const transactions = await transactionsCollection
      .find({ userId })
      .toArray();
    res.json(transactions);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create Transaction
app.post("/transaction", verifyToken, async (req, res) => {
  console.log("Transaction request received:", req.body);
  const { title, amount, type } = req.body;
  const userId = req.user.userId;

  if (!title || !amount || !type || !userId) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "All fields are required" });
  }

  const transactionId = uuidv4();
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    const transactionsCollection = db.collection("transaction");
    const result = await transactionsCollection.insertOne({
      transactionId,
      title,
      amount: parseInt(amount),
      type,
      date: currentDate,
      userId,
    });
    console.log("Transaction inserted successfully:", transactionId);
    res.json({ message: "Transaction added successfully", transactionId });
  } catch (err) {
    console.error("Error inserting transaction:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete Transaction
app.delete("/transaction/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  if (!id) {
    console.log("Validation failed: Missing transaction ID");
    return res.status(400).json({ error: "Transaction ID is required" });
  }

  try {
    console.log("Attempting to delete transaction:", id, "for user:", userId);
    const transactionsCollection = db.collection("transaction");
    const transaction = await transactionsCollection.findOne({
      transactionId: id,
      userId,
    });
    if (!transaction) {
      console.log("Transaction not found in DB:", id, "for user:", userId);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    const result = await transactionsCollection.deleteOne({
      transactionId: id,
      userId,
    });

    console.log("Delete result:", result);
    if (result.deletedCount === 0) {
      console.log("No transaction deleted:", id);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    console.log("Transaction deleted successfully:", id);
    res.status(200).json({ message: `Transaction with ID ${id} deleted` });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// Clear Transactions
app.delete("/transactions/clear", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log("Clearing transactions for user:", userId);
    const transactionsCollection = db.collection("transaction");
    const result = await transactionsCollection.deleteMany({ userId });

    if (result.deletedCount === 0) {
      console.log("No transactions found to delete for user:", userId);
      return res.status(404).json({ error: "No transactions found to delete" });
    }

    console.log("All transactions cleared for user:", userId);
    res.status(200).json({ message: "All transactions cleared successfully" });
  } catch (err) {
    console.error("Error clearing transactions:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update Transaction
app.put("/transaction/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, amount, type } = req.body;
  const userId = req.user.userId;

  if (!title || !amount || !type) {
    console.log("Validation failed: Missing fields", { title, amount, type });
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    console.log("Attempting to update transaction:", id, "for user:", userId);
    console.log("Update data:", { title, amount: parseInt(amount), type });
    const transactionsCollection = db.collection("transaction");
    const transaction = await transactionsCollection.findOne({
      transactionId: id,
      userId,
    });
    if (!transaction) {
      console.log("Transaction not found in DB:", id, "for user:", userId);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    const result = await transactionsCollection.updateOne(
      { transactionId: id, userId },
      { $set: { title, amount: parseInt(amount), type } }
    );

    console.log("Update result:", result);
    if (result.matchedCount === 0) {
      console.log("No transaction matched for update:", id);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    console.log("Transaction updated successfully:", id);
    res.json({ message: "Transaction updated successfully" });
  } catch (err) {
    console.error("Error updating transaction:", err);
    res.status(500).json({ error: "Error updating transaction" });
  }
});

// Cron Job: Month-End Balance
cron.schedule("59 23 28-31 * *", async () => {
  console.log("Cron job running at month's end...");
  const currentMonth = new Date().getMonth() + 1;
  const lastDay = new Date(new Date().getFullYear(), currentMonth, 0).getDate();

  if (new Date().getDate() === lastDay) {
    try {
      const usersCollection = db.collection("users");
      const transactionsCollection = db.collection("transaction");

      const users = await usersCollection.find().toArray();
      for (const user of users) {
        const userId = user._id.toString();

        const income = await transactionsCollection
          .aggregate([
            { $match: { userId, type: "Income" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ])
          .toArray();

        const remainingIncome = income[0]?.total || 0;

        await transactionsCollection.insertOne({
          transactionId: uuidv4(),
          title: "Previous Month Balance",
          amount: remainingIncome,
          type: "Income",
          date: new Date().toISOString().split("T")[0],
          userId,
        });

        await transactionsCollection.deleteMany({ userId, type: "Expenses" });
        console.log(`Monthly reset completed successfully for user ${userId}`);
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  }
});

// Generate PDF Report
app.get("/generate-pdf", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const fileName = `Transaction_Report_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  try {
    const transactionsCollection = db.collection("transaction");
    const transactions = await transactionsCollection
      .find({ userId })
      .toArray();

    // Calculate Total Income, Total Expenses, and Remaining Amount
    const totalIncome = transactions.reduce((sum, t) => {
      return t.type === "Income" ? sum + t.amount : sum;
    }, 0);
    const totalExpenses = transactions.reduce((sum, t) => {
      return t.type === "Expenses" ? sum + t.amount : sum;
    }, 0);
    const remainingAmount = totalIncome - totalExpenses;

    console.log("PDF Calculations for user:", userId);
    console.log("Total Income:", totalIncome);
    console.log("Total Expenses:", totalExpenses);
    console.log("Remaining Amount:", remainingAmount);

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader("Content-Type", "application/pdf");

    const pdfDoc = new PDFDocument({ margin: 30, size: "A4" });
    pdfDoc.pipe(fs.createWriteStream(fileName));
    pdfDoc.pipe(res);

    pdfDoc
      .fontSize(18)
      .text("Your Transactions Report", { align: "center", underline: true })
      .moveDown(2);

    const headers = ["Date", "Title", "Amount (Rp)", "Type"];
    const columnWidths = [150, 150, 150, 100];
    let yPosition = pdfDoc.y;

    headers.forEach((header, i) => {
      pdfDoc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
          header,
          50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
          yPosition
        );
    });

    pdfDoc.moveDown(0.5);
    yPosition = pdfDoc.y;
    pdfDoc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    pdfDoc.moveDown(0.5);

    transactions.forEach((transaction) => {
      yPosition = pdfDoc.y;
      const rowData = [
        new Date(transaction.date).toLocaleDateString(),
        transaction.title,
        transaction.amount,
        transaction.type,
      ];

      rowData.forEach((data, i) => {
        pdfDoc
          .font("Helvetica")
          .fontSize(10)
          .text(
            String(data),
            50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
            yPosition
          );
      });
      pdfDoc.moveDown(0.5);
    });

    // Add Total Income, Total Expenses, and Remaining Amount
    pdfDoc.moveDown(1);
    yPosition = pdfDoc.y;
    pdfDoc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(
        "Total Income:",
        50 + columnWidths.slice(0, 1).reduce((a, b) => a + b, 0),
        yPosition
      )
      .text(
        totalIncome,
        50 + columnWidths.slice(0, 2).reduce((a, b) => a + b, 0),
        yPosition
      );
    pdfDoc.moveDown(0.5);
    yPosition = pdfDoc.y;
    pdfDoc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(
        "Total Expenses:",
        50 + columnWidths.slice(0, 1).reduce((a, b) => a + b, 0),
        yPosition
      )
      .text(
        totalExpenses,
        50 + columnWidths.slice(0, 2).reduce((a, b) => a + b, 0),
        yPosition
      );
    pdfDoc.moveDown(0.5);
    yPosition = pdfDoc.y;
    pdfDoc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(
        "Remaining Amount:",
        50 + columnWidths.slice(0, 1).reduce((a, b) => a + b, 0),
        yPosition
      )
      .text(
        remainingAmount,
        50 + columnWidths.slice(0, 2).reduce((a, b) => a + b, 0),
        yPosition
      );

    pdfDoc.end();
    console.log("PDF generated successfully for user:", userId);
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// ==================== GROUP MANAGEMENT API ====================

// Get user's groups
app.get("/groups", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const groupsCollection = db.collection("groups");
    const groups = await groupsCollection.find({ 
      $or: [{ ownerId: userId }, { "members.userId": userId }] 
    }).toArray();
    res.json(groups);
  } catch (err) {
    console.error("Error fetching groups:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create new group
app.post("/groups", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { groupName, monthlyContribution, members } = req.body;

  console.log("Create group request:", { groupName, monthlyContribution, members, userId });

  if (!groupName) {
    console.log("Validation failed: Missing groupName");
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    const groupsCollection = db.collection("groups");
    const groupId = uuidv4();
    
    // Initialize each member with 0 balance
    const groupMembers = members?.map(m => ({
      ...m,
      userId: m.userId || null,
      balance: 0,
      totalPaid: 0
    })) || [];

    // Add owner as first member if not already included
    const ownerExists = groupMembers.some(m => m.userId === userId);
    if (!ownerExists) {
      const ownerName = req.user.username || req.user.email?.split('@')[0] || "Me";
      groupMembers.unshift({
        name: ownerName,
        userId: userId,
        balance: 0,
        totalPaid: 0
      });
    }

    console.log("Inserting group:", { groupId, groupName, members: groupMembers });

    await groupsCollection.insertOne({
      groupId,
      groupName,
      monthlyContribution: parseInt(monthlyContribution) || 0,
      ownerId: userId,
      members: groupMembers,
      createdAt: new Date().toISOString(),
      currentMonth: new Date().toISOString().slice(0, 7)
    });

    console.log("Group created successfully:", groupId);
    res.status(201).json({ message: "Group created successfully", groupId });
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: `Error creating group: ${err.message}` });
  }
});

// Get group details
app.get("/groups/:groupId", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is member or owner
    const isMember = group.members.some(m => m.userId === userId) || group.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(group);
  } catch (err) {
    console.error("Error fetching group:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update group
app.put("/groups/:groupId", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  const { groupName, monthlyRent, members } = req.body;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.ownerId !== userId) {
      return res.status(403).json({ error: "Only owner can update group" });
    }

    await groupsCollection.updateOne(
      { groupId },
      { $set: { 
        groupName: groupName || group.groupName,
        monthlyRent: monthlyRent ? parseInt(monthlyRent) : group.monthlyRent,
        members: members || group.members
      }}
    );

    res.json({ message: "Group updated successfully" });
  } catch (err) {
    console.error("Error updating group:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete group
app.delete("/groups/:groupId", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.ownerId !== userId) {
      return res.status(403).json({ error: "Only owner can delete group" });
    }

    await groupsCollection.deleteOne({ groupId });
    // Also delete group expenses
    const expensesCollection = db.collection("groupExpenses");
    await expensesCollection.deleteMany({ groupId });

    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add member to group
app.post("/groups/:groupId/members", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Member name is required" });
  }

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.ownerId !== userId) {
      return res.status(403).json({ error: "Only owner can add members" });
    }

    const newMember = {
      name,
      userId: null,
      rentPaid: false,
      rentPaidDate: null
    };

    await groupsCollection.updateOne(
      { groupId },
      { $push: { members: newMember } }
    );

    res.status(201).json({ message: "Member added successfully" });
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ error: err.message });
  }
});

// Remove member from group
app.delete("/groups/:groupId/members/:memberName", verifyToken, async (req, res) => {
  const { groupId, memberName } = req.params;
  const userId = req.user.userId;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.ownerId !== userId) {
      return res.status(403).json({ error: "Only owner can remove members" });
    }

    await groupsCollection.updateOne(
      { groupId },
      { $pull: { members: { name: memberName } } }
    );

    res.json({ message: "Member removed successfully" });
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark rent as paid/unpaid
app.put("/groups/:groupId/members/:memberName/rent", verifyToken, async (req, res) => {
  const { groupId, memberName } = req.params;
  const userId = req.user.userId;
  const { rentPaid } = req.body;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isMember = group.members.some(m => m.name === memberName && m.userId === userId);
    const isOwner = group.ownerId === userId;
    
    if (!isMember && !isOwner) {
      return res.status(403).json({ error: "Access denied" });
    }

    await groupsCollection.updateOne(
      { groupId, "members.name": memberName },
      { $set: { 
        "members.$.rentPaid": rentPaid,
        "members.$.rentPaidDate": rentPaid ? new Date().toISOString() : null
      }}
    );

    res.json({ message: `Rent marked as ${rentPaid ? 'paid' : 'unpaid'}` });
  } catch (err) {
    console.error("Error updating rent status:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get group expenses
app.get("/groups/:groupId/expenses", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isMember = group.members.some(m => m.userId === userId) || group.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const expensesCollection = db.collection("groupExpenses");
    const expenses = await expensesCollection.find({ groupId }).sort({ date: -1 }).toArray();
    res.json(expenses);
  } catch (err) {
    console.error("Error fetching group expenses:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add group expense
app.post("/groups/:groupId/expenses", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  const { title, amount, paidBy, splitBetween, type } = req.body;

  if (!title || !amount || !paidBy) {
    return res.status(400).json({ error: "Title, amount and payer are required" });
  }

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isMember = group.members.some(m => m.userId === userId) || group.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const expenseId = uuidv4();
    const expensesCollection = db.collection("groupExpenses");
    
    await expensesCollection.insertOne({
      expenseId,
      groupId,
      title,
      amount: parseInt(amount),
      paidBy,
      splitBetween: splitBetween || group.members.map(m => m.name),
      type: type || "Common",
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: "Expense added successfully", expenseId });
  } catch (err) {
    console.error("Error adding group expense:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete group expense
app.delete("/groups/:groupId/expenses/:expenseId", verifyToken, async (req, res) => {
  const { groupId, expenseId } = req.params;
  const userId = req.user.userId;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isMember = group.members.some(m => m.userId === userId) || group.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const expensesCollection = db.collection("groupExpenses");
    await expensesCollection.deleteOne({ expenseId, groupId });

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Error deleting group expense:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get group balance summary
app.get("/groups/:groupId/balance", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isMember = group.members.some(m => m.userId === userId) || group.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const expensesCollection = db.collection("groupExpenses");
    const expenses = await expensesCollection.find({ groupId }).toArray();

    // Initialize balances
    const balances = {};
    group.members.forEach(m => {
      balances[m.name] = {
        name: m.name,
        totalPaid: m.totalPaid || 0,
        balance: m.balance || 0
      };
    });

    // Calculate balances from expenses
    expenses.forEach(exp => {
      if (balances[exp.paidBy]) {
        balances[exp.paidBy].totalPaid += exp.amount;
        balances[exp.paidBy].balance += exp.amount;
      }
      
      const splitAmount = exp.amount / exp.splitBetween.length;
      exp.splitBetween.forEach(name => {
        if (balances[name]) {
          balances[name].balance -= splitAmount;
        }
      });
    });

    // Calculate settlements between members
    const settlements = [];
    const positive = [];
    const negative = [];

    Object.values(balances).forEach(b => {
      if (b.balance > 0) positive.push(b);
      if (b.balance < 0) negative.push(b);
    });

    positive.sort((a, b) => b.balance - a.balance);
    negative.sort((a, b) => a.balance - b.balance);

    let i = 0, j = 0;
    while (i < positive.length && j < negative.length) {
      const from = negative[j];
      const to = positive[i];
      const amount = Math.min(-from.balance, to.balance);
      
      if (amount > 0) {
        settlements.push({
          from: from.name,
          to: to.name,
          amount: Math.round(amount)
        });
      }
      
      from.balance += amount;
      to.balance -= amount;
      
      if (from.balance >= 0) j++;
      if (to.balance <= 0) i++;
    }

    res.json({
      balances: Object.values(balances),
      settlements,
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      totalMembers: group.members.length,
      monthlyContribution: group.monthlyContribution || 0
    });
  } catch (err) {
    console.error("Error calculating balance:", err);
    res.status(500).json({ error: err.message });
  }
});

// Make a payment from one member to another
app.post("/groups/:groupId/pay", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  const { from, to, amount, note } = req.body;

  if (!from || !to || !amount) {
    return res.status(400).json({ error: "From, to and amount are required" });
  }

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isMember = group.members.some(m => m.userId === userId) || group.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const paymentId = uuidv4();
    const expensesCollection = db.collection("groupExpenses");
    
    // Record the payment as an expense
    await expensesCollection.insertOne({
      expenseId: paymentId,
      groupId,
      title: note || `Payment from ${from} to ${to}`,
      amount: parseInt(amount),
      paidBy: from,
      splitBetween: [to],  // Only the receiver benefits
      type: "Payment",
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: "Payment recorded successfully", paymentId });
  } catch (err) {
    console.error("Error making payment:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add money to group (member pays their share)
app.post("/groups/:groupId/add-money", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  const { memberName, amount, note } = req.body;

  if (!memberName || !amount) {
    return res.status(400).json({ error: "Member name and amount are required" });
  }

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isMember = group.members.some(m => m.userId === userId) || group.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const paymentId = uuidv4();
    const expensesCollection = db.collection("groupExpenses");
    
    // Record the payment - split among all members equally
    await expensesCollection.insertOne({
      expenseId: paymentId,
      groupId,
      title: note || `${memberName} added money`,
      amount: parseInt(amount),
      paidBy: memberName,
      splitBetween: group.members.map(m => m.name),  // Everyone owes their share
      type: "Payment",
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: "Money added successfully", paymentId });
  } catch (err) {
    console.error("Error adding money:", err);
    res.status(500).json({ error: err.message });
  }
});
  }
});

// Reset monthly rent status
app.post("/groups/:groupId/reset-rent", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.ownerId !== userId) {
      return res.status(403).json({ error: "Only owner can reset rent" });
    }

    // Reset all members' rent status
    await groupsCollection.updateOne(
      { groupId },
      { $set: { 
        "members.$[].rentPaid": false,
        "members.$[].rentPaidDate": null,
        currentMonth: new Date().toISOString().slice(0, 7)
      }}
    );

    res.json({ message: "Rent status reset for new month" });
  } catch (err) {
    console.error("Error resetting rent:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reset all balances in a group
app.post("/groups/:groupId/reset-balances", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    const groupsCollection = db.collection("groups");
    const group = await groupsCollection.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.ownerId !== userId) {
      return res.status(403).json({ error: "Only owner can reset balances" });
    }

    // Reset all members' balance and totalPaid
    await groupsCollection.updateOne(
      { groupId },
      { $set: { 
        "members.$[].balance": 0,
        "members.$[].totalPaid": 0
      }}
    );

    // Delete all expenses
    const expensesCollection = db.collection("groupExpenses");
    await expensesCollection.deleteMany({ groupId });

    res.json({ message: "All balances reset successfully" });
  } catch (err) {
    console.error("Error resetting balances:", err);
    res.status(500).json({ error: err.message });
  }
});
