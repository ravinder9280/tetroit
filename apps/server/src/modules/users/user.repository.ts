// ─── User Repository ──────────────────────────────────────────────────────────
// Data-access layer for user profile operations.
// Route handlers call the service; the service calls this repository.

import { prisma } from "../../lib/db.js";
import type { UpdateUserProfileBody } from "@monorepo/types";

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        profession: true,
        interests: true,
        personality: true,
        communicationStyle: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(id: string, data: UpdateUserProfileBody) {
    return prisma.user.update({
      where: { id },
      data: {
        bio: data.bio,
        profession: data.profession,
        interests: data.interests,
        personality: data.personality,
        communicationStyle: data.communicationStyle,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        profession: true,
        interests: true,
        personality: true,
        communicationStyle: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
