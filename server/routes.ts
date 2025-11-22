import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import ExcelJS from "exceljs";
import { insertUserSchema, loginSchema, insertCarSchema, scanSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Authentication middleware
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "Invalid session" });
  }
  
  (req as any).user = user;
  next();
}

// Admin middleware
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "smart-parking-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  // Authentication endpoints
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromError(result.error);
        return res.status(400).json({ message: error.toString() });
      }

      const { username, password, role } = result.data;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role,
      });

      // Set session
      req.session.userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: error.message || "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromError(result.error);
        return res.status(400).json({ message: error.toString() });
      }

      const { username, password } = result.data;

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Set session
      req.session.userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Car registration endpoints (admin only)
  app.post("/api/cars", requireAuth, requireAdmin, async (req, res) => {
    try {
      const result = insertCarSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromError(result.error);
        return res.status(400).json({ message: error.toString() });
      }

      const { plateNumber, ownerName } = result.data;

      // Check if plate number already exists
      const existingCar = await storage.getCarByPlateNumber(plateNumber);
      if (existingCar) {
        return res.status(400).json({ message: "Vehicle with this plate number already registered" });
      }

      // Generate unique QR value
      const timestamp = Date.now();
      const randomId = randomBytes(3).toString("hex");
      const qrValue = `CAR-${timestamp}-${randomId}`;

      // Generate QR code
      const qrCode = await QRCode.toDataURL(qrValue);

      // Create car
      const car = await storage.createCar({
        plateNumber,
        ownerName,
        qrValue,
        qrCode,
      });

      res.json({ car, qrCode });
    } catch (error: any) {
      console.error("Car registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  // QR scanning endpoint (allow public scanning so customers can scan without login)
  app.post("/api/scan", async (req, res) => {
    try {
      const result = scanSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromError(result.error);
        return res.status(400).json({ message: error.toString() });
      }

      const { qrCode } = result.data;

      // Find car by QR value
      const car = await storage.getCarByQrValue(qrCode);
      if (!car) {
        return res.status(404).json({ message: "Invalid QR code - Vehicle not registered" });
      }

      // Check for active visit
      const activeVisit = await storage.getActiveVisitByCarId(car.id);

      if (activeVisit) {
        // Check-out
        const checkOutTime = new Date();
        const checkInTime = new Date(activeVisit.checkInTime);
        const durationMs = checkOutTime.getTime() - checkInTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        const fee = 20; // Fixed fee of 20 EGP

        const updatedVisit = await storage.updateVisitCheckout(
          activeVisit.id,
          checkOutTime,
          durationMinutes,
          fee
        );

        res.json({
          message: `✓ Check-out successful! Duration: ${durationMinutes} min, Fee: ${fee} EGP`,
          type: "checkout",
          visit: updatedVisit,
        });
      } else {
        // Check-in
        const visit = await storage.createVisit({
          carId: car.id,
          plateNumber: car.plateNumber,
          ownerName: car.ownerName,
        });

        res.json({
          message: `✓ Check-in successful! Welcome ${car.ownerName}`,
          type: "checkin",
          visit,
        });
      }
    } catch (error: any) {
      console.error("Scan error:", error);
      res.status(500).json({ message: error.message || "Scan failed" });
    }
  });

  // Visits endpoints (admin only)
  app.get("/api/visits", requireAuth, requireAdmin, async (req, res) => {
    try {
      const visits = await storage.getAllVisits();
      res.json(visits);
    } catch (error: any) {
      console.error("Get visits error:", error);
      res.status(500).json({ message: error.message || "Failed to fetch visits" });
    }
  });

  app.get("/api/visits/export", requireAuth, requireAdmin, async (req, res) => {
    try {
      const visits = await storage.getAllVisits();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Parking Visits");

      // Add headers
      worksheet.columns = [
        { header: "Plate Number", key: "plateNumber", width: 15 },
        { header: "Owner Name", key: "ownerName", width: 20 },
        { header: "Check In", key: "checkInTime", width: 20 },
        { header: "Check Out", key: "checkOutTime", width: 20 },
        { header: "Duration (min)", key: "duration", width: 15 },
        { header: "Fee (EGP)", key: "fee", width: 12 },
        { header: "Status", key: "status", width: 12 },
      ];

      // Add data
      visits.forEach((visit) => {
        worksheet.addRow({
          plateNumber: visit.plateNumber,
          ownerName: visit.ownerName,
          checkInTime: new Date(visit.checkInTime).toLocaleString(),
          checkOutTime: visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleString() : "-",
          duration: visit.duration || "-",
          fee: visit.fee || "-",
          status: visit.isCheckedIn ? "Checked In" : "Checked Out",
        });
      });

      // Style headers
      worksheet.getRow(1).font = { bold: true };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=parking-visits.xlsx");
      res.send(buffer);
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ message: error.message || "Export failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
