// server/index-prod.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";
import session from "express-session";

// server/storage.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "customer"] }).notNull().default("customer"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var cars = pgTable("cars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plateNumber: text("plate_number").notNull().unique(),
  ownerName: text("owner_name").notNull(),
  qrValue: text("qr_value").notNull().unique(),
  qrCode: text("qr_code").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  carId: varchar("car_id").notNull().references(() => cars.id),
  plateNumber: text("plate_number").notNull(),
  ownerName: text("owner_name").notNull(),
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  duration: integer("duration"),
  fee: integer("fee"),
  isCheckedIn: boolean("is_checked_in").notNull().default(true)
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true
});
var loginSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertCarSchema = createInsertSchema(cars).pick({
  plateNumber: true,
  ownerName: true
});
var scanSchema = z.object({
  qrCode: z.string().min(1, "QR code is required")
});

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool);
var DbStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Car operations
  async getCarByQrValue(qrValue) {
    const [car] = await db.select().from(cars).where(eq(cars.qrValue, qrValue)).limit(1);
    return car;
  }
  async getCarByPlateNumber(plateNumber) {
    const [car] = await db.select().from(cars).where(eq(cars.plateNumber, plateNumber)).limit(1);
    return car;
  }
  async createCar(car) {
    const [newCar] = await db.insert(cars).values(car).returning();
    return newCar;
  }
  async getAllCars() {
    return await db.select().from(cars);
  }
  // Visit operations
  async createVisit(visit) {
    const [newVisit] = await db.insert(visits).values(visit).returning();
    return newVisit;
  }
  async getActiveVisitByCarId(carId) {
    const [visit] = await db.select().from(visits).where(eq(visits.carId, carId)).orderBy(desc(visits.checkInTime)).limit(1);
    return visit && visit.isCheckedIn ? visit : void 0;
  }
  async updateVisitCheckout(visitId, checkOutTime, duration, fee) {
    const [updatedVisit] = await db.update(visits).set({
      checkOutTime,
      duration,
      fee,
      isCheckedIn: false
    }).where(eq(visits.id, visitId)).returning();
    return updatedVisit;
  }
  async getAllVisits() {
    return await db.select().from(visits).orderBy(desc(visits.checkInTime));
  }
};
var storage = new DbStorage();

// server/routes.ts
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import ExcelJS from "exceljs";
import { fromError } from "zod-validation-error";
async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {
    });
    return res.status(401).json({ message: "Invalid session" });
  }
  req.user = user;
  next();
}
async function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
async function registerRoutes(app2) {
  app2.use(
    session({
      secret: process.env.SESSION_SECRET || "smart-parking-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1e3 * 60 * 60 * 24 * 7
        // 7 days
      }
    })
  );
  app2.post("/api/auth/signup", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromError(result.error);
        return res.status(400).json({ message: error.toString() });
      }
      const { username, password, role } = result.data;
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role
      });
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: error.message || "Signup failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromError(result.error);
        return res.status(400).json({ message: error.toString() });
      }
      const { username, password } = result.data;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = req.user;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  app2.post("/api/cars", requireAuth, requireAdmin, async (req, res) => {
    try {
      const result = insertCarSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromError(result.error);
        return res.status(400).json({ message: error.toString() });
      }
      const { plateNumber, ownerName } = result.data;
      const existingCar = await storage.getCarByPlateNumber(plateNumber);
      if (existingCar) {
        return res.status(400).json({ message: "Vehicle with this plate number already registered" });
      }
      const timestamp2 = Date.now();
      const randomId = randomBytes(3).toString("hex");
      const qrValue = `CAR-${timestamp2}-${randomId}`;
      const qrCode = await QRCode.toDataURL(qrValue);
      const car = await storage.createCar({
        plateNumber,
        ownerName,
        qrValue,
        qrCode
      });
      res.json({ car, qrCode });
    } catch (error) {
      console.error("Car registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });
  app2.post("/api/scan", async (req, res) => {
    try {
      const result = scanSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromError(result.error);
        return res.status(400).json({ message: error.toString() });
      }
      const { qrCode } = result.data;
      const car = await storage.getCarByQrValue(qrCode);
      if (!car) {
        return res.status(404).json({ message: "Invalid QR code - Vehicle not registered" });
      }
      const activeVisit = await storage.getActiveVisitByCarId(car.id);
      if (activeVisit) {
        const checkOutTime = /* @__PURE__ */ new Date();
        const checkInTime = new Date(activeVisit.checkInTime);
        const durationMs = checkOutTime.getTime() - checkInTime.getTime();
        const durationMinutes = Math.round(durationMs / (1e3 * 60));
        const fee = 20;
        const updatedVisit = await storage.updateVisitCheckout(
          activeVisit.id,
          checkOutTime,
          durationMinutes,
          fee
        );
        res.json({
          message: `\u2713 Check-out successful! Duration: ${durationMinutes} min, Fee: ${fee} EGP`,
          type: "checkout",
          visit: updatedVisit
        });
      } else {
        const visit = await storage.createVisit({
          carId: car.id,
          plateNumber: car.plateNumber,
          ownerName: car.ownerName
        });
        res.json({
          message: `\u2713 Check-in successful! Welcome ${car.ownerName}`,
          type: "checkin",
          visit
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      res.status(500).json({ message: error.message || "Scan failed" });
    }
  });
  app2.get("/api/visits", requireAuth, requireAdmin, async (req, res) => {
    try {
      const visits2 = await storage.getAllVisits();
      res.json(visits2);
    } catch (error) {
      console.error("Get visits error:", error);
      res.status(500).json({ message: error.message || "Failed to fetch visits" });
    }
  });
  app2.get("/api/visits/export", requireAuth, requireAdmin, async (req, res) => {
    try {
      const visits2 = await storage.getAllVisits();
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Parking Visits");
      worksheet.columns = [
        { header: "Plate Number", key: "plateNumber", width: 15 },
        { header: "Owner Name", key: "ownerName", width: 20 },
        { header: "Check In", key: "checkInTime", width: 20 },
        { header: "Check Out", key: "checkOutTime", width: 20 },
        { header: "Duration (min)", key: "duration", width: 15 },
        { header: "Fee (EGP)", key: "fee", width: 12 },
        { header: "Status", key: "status", width: 12 }
      ];
      visits2.forEach((visit) => {
        worksheet.addRow({
          plateNumber: visit.plateNumber,
          ownerName: visit.ownerName,
          checkInTime: new Date(visit.checkInTime).toLocaleString(),
          checkOutTime: visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleString() : "-",
          duration: visit.duration || "-",
          fee: visit.fee || "-",
          status: visit.isCheckedIn ? "Checked In" : "Checked Out"
        });
      });
      worksheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=parking-visits.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: error.message || "Export failed" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "localhost";
  server.listen({
    port,
    host
  }, () => {
    log(`serving on http://${host}:${port}`);
  });
}

// server/index-prod.ts
async function serveStatic(app2, _server) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
(async () => {
  await runApp(serveStatic);
})();
export {
  serveStatic
};
