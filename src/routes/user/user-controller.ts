import { hashPassword } from "better-auth/crypto";
import { prismaClient as prisma } from "../../lib/prisma";

import {
  DeleteUserError,
  UpdateUserProfileError,
} from "./user-types";

// Import this if it exists in your project
// import { renameNamespace } from "../../lib/your-file";

export const UpdateUserProfile = async ({
  userId,
  name,
  email,
  password,
}: {
  userId: string;
  name?: string;
  email?: string;
  password?: string;
}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw UpdateUserProfileError.USER_NOT_FOUND;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        throw UpdateUserProfileError.INVALID_NAME;
      }

      if (name === user.name) {
        throw UpdateUserProfileError.SAME_AS_PREVIOUS_NAME;
      }
    }

    if (email !== undefined) {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isValid) {
        throw UpdateUserProfileError.INVALID_EMAIL;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw UpdateUserProfileError.EMAIL_ALREADY_EXISTS;
      }
    }

    if (password !== undefined && password.length < 6) {
      throw UpdateUserProfileError.PASSWORD_TOO_WEAK;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },

      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(password !== undefined && {
          password: await hashPassword(password),
        }),
      },

      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Uncomment only after importing renameNamespace
    /*
    if (name !== undefined && name !== user.name) {
      await renameNamespace(userId, user.name, name);
    }
    */

    return updatedUser;
  } catch (error) {
    if (
      error === UpdateUserProfileError.USER_NOT_FOUND ||
      error === UpdateUserProfileError.INVALID_NAME ||
      error === UpdateUserProfileError.SAME_AS_PREVIOUS_NAME ||
      error === UpdateUserProfileError.INVALID_EMAIL ||
      error === UpdateUserProfileError.EMAIL_ALREADY_EXISTS ||
      error === UpdateUserProfileError.PASSWORD_TOO_WEAK
    ) {
      throw error;
    }

    console.error("UpdateUserProfile error:", error);
    throw UpdateUserProfileError.UNKNOWN;
  }
};

export const DeleteUserAccount = async ({
  userId,
}: {
  userId: string;
}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw DeleteUserError.USER_NOT_FOUND;
    }

    const memoryCount = await prisma.memory.count({
      where: { userId },
    });

    if (memoryCount > 0) {
      throw DeleteUserError.USER_HAS_MEMORIES;
    }

    const chatCount = await prisma.chatSession.count({
      where: { userId },
    });

    if (chatCount > 0) {
      throw DeleteUserError.USER_HAS_CHATS;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return "User account deleted successfully.";
  } catch (error) {
    if (
      error === DeleteUserError.USER_NOT_FOUND ||
      error === DeleteUserError.USER_HAS_MEMORIES ||
      error === DeleteUserError.USER_HAS_CHATS
    ) {
      throw error;
    }

    console.error("DeleteUserAccount error:", error);
    throw DeleteUserError.UNKNOWN;
  }
};