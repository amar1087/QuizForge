import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp, uuid, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"), // null for Google sign-in users
  googleId: text("google_id"),
  profileImageUrl: text("profile_image_url"),
  credits: integer("credits").default(0),
  currentPlan: text("current_plan", { enum: ["free", "practice_squad", "rookie", "pro_bowl", "mvp", "hall_of_fame"] }).default("free"),
  planExpiresAt: timestamp("plan_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status", { enum: ["queued", "processing", "succeeded", "failed"] }).notNull().default("queued"),
  inputHash: text("input_hash").notNull(),
  teamName: text("team_name").notNull(),
  opponentTeamName: text("opponent_team_name").notNull(),
  yourRosterRaw: jsonb("your_roster_raw"),
  opponentRosterRaw: jsonb("opponent_roster_raw"),
  genre: text("genre", { enum: ["country", "rap", "electronic", "pop", "blues", "funk", "rnb", "gospel", "rock", "reggae"] }).notNull(),
  tone: text("tone", { enum: ["mild", "medium", "savage"] }).notNull(),
  persona: text("persona", { enum: ["first_person", "narrator"] }).notNull(),
  ratingMode: text("rating_mode", { enum: ["PG", "NSFW"] }).notNull(),
  vocalGender: text("vocal_gender", { enum: ["male", "female"] }).notNull().default("male"),
  stripeSessionId: text("stripe_session_id"),
  sunoRequestId: text("suno_request_id"),
  lyrics: text("lyrics"),
  lyricsLrc: text("lyrics_lrc"),
  mp3Path: text("mp3_path"),
  previewMp3Path: text("preview_mp3_path"),
  durationSec: integer("duration_sec"),
  errorMessage: text("error_message"),
  clientId: text("client_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  amount: integer("amount").notNull(),
  credits: integer("credits").notNull(),
  planType: text("plan_type", { enum: ["practice_squad", "rookie", "pro_bowl", "mvp", "hall_of_fame"] }).notNull(),
  clientId: text("client_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Credit transaction log
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["purchase", "usage", "refund", "bonus"] }).notNull(),
  amount: integer("amount").notNull(), // positive for gains, negative for usage
  description: text("description").notNull(),
  jobId: uuid("job_id").references(() => jobs.id), // null for purchases/bonuses
  purchaseId: uuid("purchase_id").references(() => purchases.id), // null for usage
  createdAt: timestamp("created_at").defaultNow(),
});

// User's song library
export const userLibrary = pgTable("user_library", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  title: text("title"), // user can rename their songs
  isLiked: boolean("is_liked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  googleId: true,
  profileImageUrl: true,
});

export const insertJobSchema = createInsertSchema(jobs).pick({
  teamName: true,
  opponentTeamName: true,
  yourRosterRaw: true,
  opponentRosterRaw: true,
  genre: true,
  tone: true,
  persona: true,
  ratingMode: true,
  vocalGender: true,
  clientId: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).pick({
  jobId: true,
  userId: true,
  stripeSessionId: true,
  amount: true,
  credits: true,
  planType: true,
  clientId: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).pick({
  userId: true,
  type: true,
  amount: true,
  description: true,
  jobId: true,
  purchaseId: true,
});

export const insertUserLibrarySchema = createInsertSchema(userLibrary).pick({
  userId: true,
  jobId: true,
  title: true,
  isLiked: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type UserLibrary = typeof userLibrary.$inferSelect;
export type InsertUserLibrary = z.infer<typeof insertUserLibrarySchema>;

// Enum types
export type Genre = "country" | "rap" | "electronic" | "pop" | "blues" | "funk" | "rnb" | "gospel" | "rock" | "reggae";
export type Tone = "mild" | "medium" | "savage";
export type Persona = "first_person" | "narrator";
export type RatingMode = "PG" | "NSFW";
export type VocalGender = "male" | "female";
export type JobStatus = "queued" | "processing" | "succeeded" | "failed";
export type PlanType = "free" | "practice_squad" | "rookie" | "pro_bowl" | "mvp" | "hall_of_fame";
export type CreditTransactionType = "purchase" | "usage" | "refund" | "bonus";

// Dynamic roster structure - supports any lineup format
export interface PlayerRoster {
  [position: string]: string;
}

// Common position types that might appear
export type PositionType = 'QB' | 'RB' | 'RB1' | 'RB2' | 'WR' | 'WR1' | 'WR2' | 'WR3' | 'TE' | 'TE1' | 'TE2' | 'FLEX' | 'WRT' | 'WRT1' | 'WRT2' | 'K' | 'DEF' | 'DST';
