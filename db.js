import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg; // Ambil Pool dari pg
const { HOST, PORT, USER, PASSWORD, DATABASE } = process.env;

// Buat koneksi ke PostgreSQL
export const connection = new Pool({
  host: HOST,
  port: Number(PORT),
  user: USER,
  password: PASSWORD,
  database: DATABASE,
});

// Contoh fungsi untuk memeriksa koneksi
(async () => {
  try {
    const client = await connection.connect(); // Gunakan koneksi
    console.log("Connected to PostgreSQL successfully!");
    client.release(); // Lepaskan koneksi setelah digunakan
  } catch (err) {
    console.error("Failed to connect to PostgreSQL:", err);
  }
})();
