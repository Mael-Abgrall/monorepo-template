import { eq } from "drizzle-orm";
import { usersTable } from "./database-pg-schema";

export async function createUser({ db }) {
  const user: typeof usersTable.$inferInsert = {
    name: "John",
    age: 30,
    email: "john@example.com",
  };

  await db.insert(usersTable).values(user);
  console.log("New user created!");
}

export async function getUsers({ db }) {
  const users = await db.select().from(usersTable);
  console.log("Getting all users from the database: ", users);
  return users;
}

export async function updateUser({ db, email }) {
  await db
    .update(usersTable)
    .set({
      age: 31,
    })
    .where(eq(usersTable.email, email));
  console.log("User info updated!");
}

export async function deleteUser({ db, email }) {
  await db.delete(usersTable).where(eq(usersTable.email, email));
  console.log("User deleted!");
}
