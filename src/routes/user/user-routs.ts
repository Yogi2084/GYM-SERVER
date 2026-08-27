import { Hono } from "hono";

import {
  DeleteUserAccount,
  UpdateUserProfile,
} from "./user-controller";

import {
  DeleteUserError,
  UpdateUserProfileError,
} from "./user-types";

type Variables = {
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export const userRoutes = new Hono<{ Variables: Variables }>();


// Update user profile
userRoutes.patch("/profile", async (c) => {
  try {
    const user = c.get("user");

    const userId = user.id;

    const { name, email, password } = await c.req.json();

    if (!userId) {
      return c.json({ error: "Missing userId." }, 400);
    }

    const updatedUser = await UpdateUserProfile({
      userId,
      name,
      email,
      password,
    });

    return c.json(updatedUser, 200);
  } catch (error) {
    switch (error) {
      case UpdateUserProfileError.USER_NOT_FOUND:
        return c.json({ error: "User not found." }, 404);

      case UpdateUserProfileError.INVALID_NAME:
        return c.json({ error: "Invalid name." }, 400);

      case UpdateUserProfileError.SAME_AS_PREVIOUS_NAME:
        return c.json({ error: "Same as previous name." }, 400);

      case UpdateUserProfileError.INVALID_EMAIL:
        return c.json({ error: "Invalid email format." }, 400);

      case UpdateUserProfileError.EMAIL_ALREADY_EXISTS:
        return c.json({ error: "Email already exists." }, 409);

      case UpdateUserProfileError.PASSWORD_TOO_WEAK:
        return c.json({ error: "Password too weak." }, 400);

      case UpdateUserProfileError.UNAUTHORIZED:
        return c.json({ error: "Unauthorized action." }, 403);

      default:
        console.error("Unhandled profile update error:", error);
        return c.json(
          { error: "Failed to update profile." },
          500
        );
    }
  }
});


// Delete user account
userRoutes.delete("/delete", async (c) => {
  try {
    const user = c.get("user");

    const userId = user.id;

    if (!userId) {
      return c.json({ error: "Missing userId." }, 400);
    }

    const result = await DeleteUserAccount({
      userId,
    });

    return c.json(result, 200);
  } catch (error) {
    switch (error) {
      case DeleteUserError.USER_NOT_FOUND:
        return c.json({ error: "User not found." }, 404);

      case DeleteUserError.USER_HAS_MEMORIES:
        return c.json(
          {
            error:
              "Cannot delete user: memories exist. Please delete all memories first.",
          },
          409
        );

      case DeleteUserError.USER_HAS_CHATS:
        return c.json(
          {
            error: "User has active chats.",
          },
          409
        );

      default:
        console.error("Unhandled delete user error:", error);

        return c.json(
          {
            error: "Failed to delete user.",
          },
          500
        );
    }
  }
});