import { type Job, type InsertJob, type Purchase, type InsertPurchase, type User, type InsertUser, type JobStatus } from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface with all required CRUD operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(id: string, credits: number): Promise<User>;

  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getJobByHash(inputHash: string): Promise<Job | undefined>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job>;
  updateJobStatus(id: string, status: JobStatus): Promise<void>;

  // Purchase operations
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchaseBySessionId(sessionId: string): Promise<Purchase | undefined>;
  getPurchasesByJobId(jobId: string): Promise<Purchase[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private jobs: Map<string, Job>;
  private purchases: Map<string, Purchase>;

  constructor() {
    this.users = new Map();
    this.jobs = new Map();
    this.purchases = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password || null,
      googleId: insertUser.googleId || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      credits: 0,
      currentPlan: 'free',
      planExpiresAt: null,
      stripeCustomerId: null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserCredits(id: string, credits: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    const updatedUser = { ...user, credits, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Job operations
  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const now = new Date();
    const job: Job = {
      id,
      status: 'queued',
      inputHash: '', // Will be set by caller
      teamName: insertJob.teamName,
      opponentTeamName: insertJob.opponentTeamName,
      yourRosterRaw: insertJob.yourRosterRaw,
      opponentRosterRaw: insertJob.opponentRosterRaw,
      genre: insertJob.genre,
      tone: insertJob.tone,
      persona: insertJob.persona,
      ratingMode: insertJob.ratingMode,
      vocalGender: insertJob.vocalGender || 'male',
      stripeSessionId: null,
      sunoRequestId: null,
      lyrics: null,
      lyricsLrc: null,
      mp3Path: null,
      previewMp3Path: null,
      durationSec: null,
      errorMessage: null,
      clientId: insertJob.clientId || null,
      createdAt: now,
      updatedAt: now
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobByHash(inputHash: string): Promise<Job | undefined> {
    return Array.from(this.jobs.values()).find(
      (job) => job.inputHash === inputHash && job.status === 'succeeded'
    );
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    const updatedJob: Job = {
      ...job,
      ...updates,
      updatedAt: new Date()
    };
    
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async updateJobStatus(id: string, status: JobStatus): Promise<void> {
    await this.updateJob(id, { status });
  }

  // Purchase operations
  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = randomUUID();
    const purchase: Purchase = {
      id,
      jobId: insertPurchase.jobId,
      userId: insertPurchase.userId,
      stripeSessionId: insertPurchase.stripeSessionId,
      amount: insertPurchase.amount,
      clientId: insertPurchase.clientId || null,
      createdAt: new Date()
    };
    this.purchases.set(id, purchase);
    return purchase;
  }

  async getPurchaseBySessionId(sessionId: string): Promise<Purchase | undefined> {
    return Array.from(this.purchases.values()).find(
      (purchase) => purchase.stripeSessionId === sessionId
    );
  }

  async getPurchasesByJobId(jobId: string): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter(
      (purchase) => purchase.jobId === jobId
    );
  }
}

export const storage = new MemStorage();
