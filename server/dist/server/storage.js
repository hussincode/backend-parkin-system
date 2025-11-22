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
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { users, cars, visits } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
var Pool = pg.Pool;
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool);
var DbStorage = /** @class */ (function () {
    function DbStorage() {
    }
    // User operations
    DbStorage.prototype.getUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(users).where(eq(users.id, id)).limit(1)];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user];
                }
            });
        });
    };
    DbStorage.prototype.getUserByUsername = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(users).where(eq(users.username, username)).limit(1)];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user];
                }
            });
        });
    };
    DbStorage.prototype.createUser = function (insertUser) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(users).values(insertUser).returning()];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user];
                }
            });
        });
    };
    // Car operations
    DbStorage.prototype.getCarByQrValue = function (qrValue) {
        return __awaiter(this, void 0, void 0, function () {
            var car;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(cars).where(eq(cars.qrValue, qrValue)).limit(1)];
                    case 1:
                        car = (_a.sent())[0];
                        return [2 /*return*/, car];
                }
            });
        });
    };
    DbStorage.prototype.getCarByPlateNumber = function (plateNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var car;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(cars).where(eq(cars.plateNumber, plateNumber)).limit(1)];
                    case 1:
                        car = (_a.sent())[0];
                        return [2 /*return*/, car];
                }
            });
        });
    };
    DbStorage.prototype.createCar = function (car) {
        return __awaiter(this, void 0, void 0, function () {
            var newCar;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(cars).values(car).returning()];
                    case 1:
                        newCar = (_a.sent())[0];
                        return [2 /*return*/, newCar];
                }
            });
        });
    };
    DbStorage.prototype.getAllCars = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(cars)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Visit operations
    DbStorage.prototype.createVisit = function (visit) {
        return __awaiter(this, void 0, void 0, function () {
            var newVisit;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(visits).values(visit).returning()];
                    case 1:
                        newVisit = (_a.sent())[0];
                        return [2 /*return*/, newVisit];
                }
            });
        });
    };
    DbStorage.prototype.getActiveVisitByCarId = function (carId) {
        return __awaiter(this, void 0, void 0, function () {
            var visit;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(visits)
                            .where(eq(visits.carId, carId))
                            .orderBy(desc(visits.checkInTime))
                            .limit(1)];
                    case 1:
                        visit = (_a.sent())[0];
                        return [2 /*return*/, visit && visit.isCheckedIn ? visit : undefined];
                }
            });
        });
    };
    DbStorage.prototype.updateVisitCheckout = function (visitId, checkOutTime, duration, fee) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedVisit;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(visits)
                            .set({
                            checkOutTime: checkOutTime,
                            duration: duration,
                            fee: fee,
                            isCheckedIn: false,
                        })
                            .where(eq(visits.id, visitId))
                            .returning()];
                    case 1:
                        updatedVisit = (_a.sent())[0];
                        return [2 /*return*/, updatedVisit];
                }
            });
        });
    };
    DbStorage.prototype.getAllVisits = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(visits).orderBy(desc(visits.checkInTime))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return DbStorage;
}());
export { DbStorage };
export var storage = new DbStorage();
