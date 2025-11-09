import { randomUUID } from "node:crypto";
import { dataStore } from "../../infrastructure/data-store";
import { AppError, NotFoundError, ValidationError } from "../../libs/common/errors";
import { User, UserRole } from "../../libs/common/types";

export interface CreateUserInput {
  role: UserRole;
  name: string;
  phone: string;
  email: string;
}

export class UserService {
  listUsers(): User[] {
    return Array.from(dataStore.users.values());
  }

  getUser(id: string): User {
    const user = dataStore.users.get(id);
    if (!user) {
      throw new NotFoundError("User", { id });
    }
    return user;
  }

  createUser(input: CreateUserInput): User {
    if (!input.name || !input.email) {
      throw new ValidationError("Name and email are required");
    }

    const existing = Array.from(dataStore.users.values()).find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase(),
    );

    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const user: User = {
      id: randomUUID(),
      createdAt: new Date(),
      ...input,
    };
    dataStore.users.set(user.id, user);
    return user;
  }
}
