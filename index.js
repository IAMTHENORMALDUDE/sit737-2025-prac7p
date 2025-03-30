const express = require("express");
const dotenv = require("dotenv");
const winston = require("winston");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = 3000;
dotenv.config();

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "calculator-microservice" },
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// Middleware to log all requests
app.use((req, res, next) => {
  const { method, url, query, ip } = req;
  logger.info({ message: `Request received`, method, url, query, ip });
  next();
});

// MongoDB connection
const mongoUrl = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:27017/calculator_db`;
let db;

MongoClient.connect(mongoUrl, { useUnifiedTopology: true })
  .then((client) => {
    db = client.db("calculator_db");
    logger.info("Connected to MongoDB");
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Helper function to validate numbers
const validateNumbers = (num1, num2) => {
  if (isNaN(num1) || isNaN(num2)) {
    return { isValid: false, message: "Invalid input: Both parameters must be numbers" };
  }
  return { isValid: true };
};

// Function to log calculation to MongoDB
const logCalculation = async (operation, num1, num2, result) => {
  try {
    const record = {
      operation,
      num1,
      num2,
      result,
      timestamp: new Date(),
    };
    await db.collection("calculations").insertOne(record);
    logger.info(`Logged ${operation}: ${num1}, ${num2} = ${result}`);
    return record;
  } catch (err) {
    logger.error(`Error logging ${operation} to MongoDB:`, err);
    throw err;
  }
};

// Addition endpoint
app.get("/add", async (req, res) => {
  const num1 = parseFloat(req.query.num1);
  const num2 = parseFloat(req.query.num2);
  const validation = validateNumbers(num1, num2);
  if (!validation.isValid) {
    logger.error(`Error in /add: ${validation.message}`);
    return res.status(400).json({ error: validation.message });
  }
  const result = num1 + num2;
  try {
    await logCalculation("add", num1, num2, result);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: "Failed to save calculation" });
  }
});

// Subtraction endpoint
app.get("/subtract", async (req, res) => {
  const num1 = parseFloat(req.query.num1);
  const num2 = parseFloat(req.query.num2);
  const validation = validateNumbers(num1, num2);
  if (!validation.isValid) {
    logger.error(`Error in /subtract: ${validation.message}`);
    return res.status(400).json({ error: validation.message });
  }
  const result = num1 - num2;
  try {
    await logCalculation("subtract", num1, num2, result);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: "Failed to save calculation" });
  }
});

// Multiplication endpoint
app.get("/multiply", async (req, res) => {
  const num1 = parseFloat(req.query.num1);
  const num2 = parseFloat(req.query.num2);
  const validation = validateNumbers(num1, num2);
  if (!validation.isValid) {
    logger.error(`Error in /multiply: ${validation.message}`);
    return res.status(400).json({ error: validation.message });
  }
  const result = num1 * num2;
  try {
    await logCalculation("multiply", num1, num2, result);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: "Failed to save calculation" });
  }
});

// Division endpoint
app.get("/divide", async (req, res) => {
  const num1 = parseFloat(req.query.num1);
  const num2 = parseFloat(req.query.num2);
  const validation = validateNumbers(num1, num2);
  if (!validation.isValid) {
    logger.error(`Error in /divide: ${validation.message}`);
    return res.status(400).json({ error: validation.message });
  }
  if (num2 === 0) {
    logger.error("Error in /divide: Division by zero is not allowed");
    return res.status(400).json({ error: "Division by zero is not allowed" });
  }
  const result = num1 / num2;
  try {
    await logCalculation("divide", num1, num2, result);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: "Failed to save calculation" });
  }
});

// Power endpoint
app.get("/power", async (req, res) => {
  const num1 = parseFloat(req.query.num1); // Base
  const num2 = parseFloat(req.query.num2); // Exponent
  const validation = validateNumbers(num1, num2);
  if (!validation.isValid) {
    logger.error(`Error in /power: ${validation.message}`);
    return res.status(400).json({ error: validation.message });
  }
  const result = Math.pow(num1, num2);
  try {
    await logCalculation("power", num1, num2, result);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: "Failed to save calculation" });
  }
});

// Modulo endpoint
app.get("/modulo", async (req, res) => {
  const num1 = parseFloat(req.query.num1);
  const num2 = parseFloat(req.query.num2);
  const validation = validateNumbers(num1, num2);
  if (!validation.isValid) {
    logger.error(`Error in /modulo: ${validation.message}`);
    return res.status(400).json({ error: validation.message });
  }
  if (num2 === 0) {
    logger.error("Error in /modulo: Modulo by zero is not allowed");
    return res.status(400).json({ error: "Modulo by zero is not allowed" });
  }
  const result = num1 % num2;
  try {
    await logCalculation("modulo", num1, num2, result);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: "Failed to save calculation" });
  }
});

// CRUD Endpoints for History

// Read: Get all history or filter by operation
app.get("/history", async (req, res) => {
  try {
    const operation = req.query.operation;
    const query = operation ? { operation } : {};
    const history = await db.collection("calculations").find(query).toArray();
    res.json(history);
  } catch (err) {
    logger.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/history/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const calculation = await db.collection("calculations").findOne({ _id: new ObjectId(id) });
    if (!calculation) {
      logger.error(`Calculation ${id} not found`);
      return res.status(404).json({ error: "Calculation not found" });
    }
    res.json(calculation);
  } catch (err) {
    logger.error(`Error fetching calculation ${id}:`, err);
    res.status(500).json({ error: "Failed to fetch calculation" });
  }
});

// Update: Modify a calculation by ID and recalculate result
app.put("/history/:id", async (req, res) => {
  const { id } = req.params;
  const { num1, num2, operation } = req.query;

  // Validate inputs
  const parsedNum1 = parseFloat(num1);
  const parsedNum2 = parseFloat(num2);
  const validation = validateNumbers(parsedNum1, parsedNum2);
  if (!validation.isValid || !num1 || !num2 || !operation) {
    logger.error(`Error in /history/${id}: Invalid or missing parameters`);
    return res.status(400).json({ error: "Invalid or missing parameters: num1, num2, and operation are required" });
  }

  // Supported operations
  const operations = {
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => {
      if (b === 0) throw new Error("Division by zero is not allowed");
      return a / b;
    },
    power: (a, b) => Math.pow(a, b),
    modulo: (a, b) => {
      if (b === 0) throw new Error("Modulo by zero is not allowed");
      return a % b;
    },
  };

  if (!operations[operation]) {
    logger.error(`Error in /history/${id}: Unsupported operation ${operation}`);
    return res.status(400).json({ error: `Unsupported operation: ${operation}` });
  }

  try {
    // Calculate new result
    const result = operations[operation](parsedNum1, parsedNum2);

    // Update the record
    const updated = await db.collection("calculations").findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          num1: parsedNum1,
          num2: parsedNum2,
          operation,
          result,
          timestamp: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    logger.info(`Updated calculation ${id}: ${operation}(${parsedNum1}, ${parsedNum2}) = ${result}`);
    res.json(updated.value);
  } catch (err) {
    logger.error(`Error updating calculation ${id}:`, err.message || err);
    res.status(500).json({ error: "Failed to update calculation" });
  }
});

// Delete: Remove a calculation by ID
app.delete("/history/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db.collection("calculations").findOneAndDelete({
      _id: new ObjectId(id),
    });

    logger.info(`Deleted calculation ${id}`);
    res.json({ message: "Calculation deleted", deleted: deleted.value });
  } catch (err) {
    logger.error(`Error deleting calculation ${id}:`, err);
    res.status(500).json({ error: "Failed to delete calculation" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Version endpoint
app.get("/version", (req, res) => {
  res.json({ version: "3.0" });
  logger.info("Version endpoint accessed: 3.0");
});

// Start the server
app.listen(port, () => {
  logger.info(`Calculator microservice running on port ${port}`);
});
