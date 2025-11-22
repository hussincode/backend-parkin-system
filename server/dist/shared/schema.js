var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export var users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    role: text("role", { enum: ["admin", "customer"] }).notNull().default("customer"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
export var cars = pgTable("cars", {
    id: varchar("id").primaryKey().default(sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    plateNumber: text("plate_number").notNull().unique(),
    ownerName: text("owner_name").notNull(),
    qrValue: text("qr_value").notNull().unique(),
    qrCode: text("qr_code").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
export var visits = pgTable("visits", {
    id: varchar("id").primaryKey().default(sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    carId: varchar("car_id").notNull().references(function () { return cars.id; }),
    plateNumber: text("plate_number").notNull(),
    ownerName: text("owner_name").notNull(),
    checkInTime: timestamp("check_in_time").notNull().defaultNow(),
    checkOutTime: timestamp("check_out_time"),
    duration: integer("duration"),
    fee: integer("fee"),
    isCheckedIn: boolean("is_checked_in").notNull().default(true),
});
export var insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
    role: true,
});
export var loginSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
});
export var insertCarSchema = createInsertSchema(cars).pick({
    plateNumber: true,
    ownerName: true,
});
export var scanSchema = z.object({
    qrCode: z.string().min(1, "QR code is required"),
});
var templateObject_1, templateObject_2, templateObject_3;
