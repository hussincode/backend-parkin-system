var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { createServer } from "http";
import session from "express-session";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import ExcelJS from "exceljs";
import { insertUserSchema, loginSchema, insertCarSchema, scanSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
// Authentication middleware
function requireAuth(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!req.session.userId) {
                        return [2 /*return*/, res.status(401).json({ message: "Authentication required" })];
                    }
                    return [4 /*yield*/, storage.getUser(req.session.userId)];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        req.session.destroy(function () { });
                        return [2 /*return*/, res.status(401).json({ message: "Invalid session" })];
                    }
                    req.user = user;
                    next();
                    return [2 /*return*/];
            }
        });
    });
}
// Admin middleware
function requireAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            user = req.user;
            if (!user || user.role !== "admin") {
                return [2 /*return*/, res.status(403).json({ message: "Admin access required" })];
            }
            next();
            return [2 /*return*/];
        });
    });
}
export function registerRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var httpServer;
        var _this = this;
        return __generator(this, function (_a) {
            // Session configuration
            app.use(session({
                secret: process.env.SESSION_SECRET || "smart-parking-secret-key-change-in-production",
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: process.env.NODE_ENV === "production",
                    httpOnly: true,
                    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
                },
            }));
            // Authentication endpoints
            app.post("/api/auth/signup", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var result, error, _a, username, password, role, existingUser, hashedPassword, user, _, userWithoutPassword, error_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 4, , 5]);
                            result = insertUserSchema.safeParse(req.body);
                            if (!result.success) {
                                error = fromError(result.error);
                                return [2 /*return*/, res.status(400).json({ message: error.toString() })];
                            }
                            _a = result.data, username = _a.username, password = _a.password, role = _a.role;
                            return [4 /*yield*/, storage.getUserByUsername(username)];
                        case 1:
                            existingUser = _b.sent();
                            if (existingUser) {
                                return [2 /*return*/, res.status(400).json({ message: "Username already exists" })];
                            }
                            return [4 /*yield*/, bcrypt.hash(password, 10)];
                        case 2:
                            hashedPassword = _b.sent();
                            return [4 /*yield*/, storage.createUser({
                                    username: username,
                                    password: hashedPassword,
                                    role: role,
                                })];
                        case 3:
                            user = _b.sent();
                            // Set session
                            req.session.userId = user.id;
                            _ = user.password, userWithoutPassword = __rest(user, ["password"]);
                            res.json(userWithoutPassword);
                            return [3 /*break*/, 5];
                        case 4:
                            error_1 = _b.sent();
                            console.error("Signup error:", error_1);
                            res.status(500).json({ message: error_1.message || "Signup failed" });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/auth/login", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var result, error, _a, username, password, user, isValid, _, userWithoutPassword, error_2;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 3, , 4]);
                            result = loginSchema.safeParse(req.body);
                            if (!result.success) {
                                error = fromError(result.error);
                                return [2 /*return*/, res.status(400).json({ message: error.toString() })];
                            }
                            _a = result.data, username = _a.username, password = _a.password;
                            return [4 /*yield*/, storage.getUserByUsername(username)];
                        case 1:
                            user = _b.sent();
                            if (!user) {
                                return [2 /*return*/, res.status(401).json({ message: "Invalid username or password" })];
                            }
                            return [4 /*yield*/, bcrypt.compare(password, user.password)];
                        case 2:
                            isValid = _b.sent();
                            if (!isValid) {
                                return [2 /*return*/, res.status(401).json({ message: "Invalid username or password" })];
                            }
                            // Set session
                            req.session.userId = user.id;
                            _ = user.password, userWithoutPassword = __rest(user, ["password"]);
                            res.json(userWithoutPassword);
                            return [3 /*break*/, 4];
                        case 3:
                            error_2 = _b.sent();
                            console.error("Login error:", error_2);
                            res.status(500).json({ message: error_2.message || "Login failed" });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/auth/logout", function (req, res) {
                req.session.destroy(function (err) {
                    if (err) {
                        return res.status(500).json({ message: "Logout failed" });
                    }
                    res.json({ message: "Logged out successfully" });
                });
            });
            app.get("/api/auth/me", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var user, _, userWithoutPassword;
                return __generator(this, function (_a) {
                    user = req.user;
                    _ = user.password, userWithoutPassword = __rest(user, ["password"]);
                    res.json(userWithoutPassword);
                    return [2 /*return*/];
                });
            }); });
            // Car registration endpoints (admin only)
            app.post("/api/cars", requireAuth, requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var result, error, _a, plateNumber, ownerName, existingCar, timestamp, randomId, qrValue, qrCode, car, error_3;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 4, , 5]);
                            result = insertCarSchema.safeParse(req.body);
                            if (!result.success) {
                                error = fromError(result.error);
                                return [2 /*return*/, res.status(400).json({ message: error.toString() })];
                            }
                            _a = result.data, plateNumber = _a.plateNumber, ownerName = _a.ownerName;
                            return [4 /*yield*/, storage.getCarByPlateNumber(plateNumber)];
                        case 1:
                            existingCar = _b.sent();
                            if (existingCar) {
                                return [2 /*return*/, res.status(400).json({ message: "Vehicle with this plate number already registered" })];
                            }
                            timestamp = Date.now();
                            randomId = randomBytes(3).toString("hex");
                            qrValue = "CAR-".concat(timestamp, "-").concat(randomId);
                            return [4 /*yield*/, QRCode.toDataURL(qrValue)];
                        case 2:
                            qrCode = _b.sent();
                            return [4 /*yield*/, storage.createCar({
                                    plateNumber: plateNumber,
                                    ownerName: ownerName,
                                    qrValue: qrValue,
                                    qrCode: qrCode,
                                })];
                        case 3:
                            car = _b.sent();
                            res.json({ car: car, qrCode: qrCode });
                            return [3 /*break*/, 5];
                        case 4:
                            error_3 = _b.sent();
                            console.error("Car registration error:", error_3);
                            res.status(500).json({ message: error_3.message || "Registration failed" });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            // QR scanning endpoint (allow public scanning so customers can scan without login)
            app.post("/api/scan", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var result, error, qrCode, car, activeVisit, checkOutTime, checkInTime, durationMs, durationMinutes, fee, updatedVisit, visit, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 7, , 8]);
                            result = scanSchema.safeParse(req.body);
                            if (!result.success) {
                                error = fromError(result.error);
                                return [2 /*return*/, res.status(400).json({ message: error.toString() })];
                            }
                            qrCode = result.data.qrCode;
                            return [4 /*yield*/, storage.getCarByQrValue(qrCode)];
                        case 1:
                            car = _a.sent();
                            if (!car) {
                                return [2 /*return*/, res.status(404).json({ message: "Invalid QR code - Vehicle not registered" })];
                            }
                            return [4 /*yield*/, storage.getActiveVisitByCarId(car.id)];
                        case 2:
                            activeVisit = _a.sent();
                            if (!activeVisit) return [3 /*break*/, 4];
                            checkOutTime = new Date();
                            checkInTime = new Date(activeVisit.checkInTime);
                            durationMs = checkOutTime.getTime() - checkInTime.getTime();
                            durationMinutes = Math.round(durationMs / (1000 * 60));
                            fee = 20;
                            return [4 /*yield*/, storage.updateVisitCheckout(activeVisit.id, checkOutTime, durationMinutes, fee)];
                        case 3:
                            updatedVisit = _a.sent();
                            res.json({
                                message: "\u2713 Check-out successful! Duration: ".concat(durationMinutes, " min, Fee: ").concat(fee, " EGP"),
                                type: "checkout",
                                visit: updatedVisit,
                            });
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, storage.createVisit({
                                carId: car.id,
                                plateNumber: car.plateNumber,
                                ownerName: car.ownerName,
                            })];
                        case 5:
                            visit = _a.sent();
                            res.json({
                                message: "\u2713 Check-in successful! Welcome ".concat(car.ownerName),
                                type: "checkin",
                                visit: visit,
                            });
                            _a.label = 6;
                        case 6: return [3 /*break*/, 8];
                        case 7:
                            error_4 = _a.sent();
                            console.error("Scan error:", error_4);
                            res.status(500).json({ message: error_4.message || "Scan failed" });
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/];
                    }
                });
            }); });
            // Visits endpoints (admin only)
            app.get("/api/visits", requireAuth, requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var visits, error_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, storage.getAllVisits()];
                        case 1:
                            visits = _a.sent();
                            res.json(visits);
                            return [3 /*break*/, 3];
                        case 2:
                            error_5 = _a.sent();
                            console.error("Get visits error:", error_5);
                            res.status(500).json({ message: error_5.message || "Failed to fetch visits" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/visits/export", requireAuth, requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var visits, workbook, worksheet_1, buffer, error_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            return [4 /*yield*/, storage.getAllVisits()];
                        case 1:
                            visits = _a.sent();
                            workbook = new ExcelJS.Workbook();
                            worksheet_1 = workbook.addWorksheet("Parking Visits");
                            // Add headers
                            worksheet_1.columns = [
                                { header: "Plate Number", key: "plateNumber", width: 15 },
                                { header: "Owner Name", key: "ownerName", width: 20 },
                                { header: "Check In", key: "checkInTime", width: 20 },
                                { header: "Check Out", key: "checkOutTime", width: 20 },
                                { header: "Duration (min)", key: "duration", width: 15 },
                                { header: "Fee (EGP)", key: "fee", width: 12 },
                                { header: "Status", key: "status", width: 12 },
                            ];
                            // Add data
                            visits.forEach(function (visit) {
                                worksheet_1.addRow({
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
                            worksheet_1.getRow(1).font = { bold: true };
                            return [4 /*yield*/, workbook.xlsx.writeBuffer()];
                        case 2:
                            buffer = _a.sent();
                            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                            res.setHeader("Content-Disposition", "attachment; filename=parking-visits.xlsx");
                            res.send(buffer);
                            return [3 /*break*/, 4];
                        case 3:
                            error_6 = _a.sent();
                            console.error("Export error:", error_6);
                            res.status(500).json({ message: error_6.message || "Export failed" });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            httpServer = createServer(app);
            return [2 /*return*/, httpServer];
        });
    });
}
