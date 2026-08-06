// ─── User Service ─────────────────────────────────────────────────────────────
// Business logic layer for user profile operations.

import type { UpdateUserProfileBody } from "@monorepo/types";
import { UserRepository } from "./user.repository.js";
import { updateUserProfileSchema } from "./user.schema.js";

export class UserService {
  private readonly repo: UserRepository;

  constructor() {
    this.repo = new UserRepository();
  }

  async getProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    return user;
  }

  async updateProfile(userId: string, body: unknown) {
    const parsed = updateUserProfileSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
      throw new ValidationError(messages);
    }
    return this.repo.updateProfile(userId, parsed.data as UpdateUserProfileBody);
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
