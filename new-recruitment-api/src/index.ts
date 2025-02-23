import sqlite3 from "sqlite3";
import { open } from "sqlite";

const main = async () => {
  const db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });
  await db.migrate();
};

main();
