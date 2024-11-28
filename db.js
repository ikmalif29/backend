import mariadb from "mariadb";
import dotenv from "dotenv";
dotenv.config();

const { HOST, PORT, USER, PASSWORD, DATABASE } = process.env;
export const connection = await mariadb.createConnection({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASSWORD,
  database: DATABASE,
});