import express from "express";
import multer from "multer";
import cors from "cors"
import path from "path"
import { connection } from "../db.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
 
const app = express();
app.use(express.json());
const __dirname = path.resolve();

app.use(cors());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.split(" ")[1];
    try {
      req.user = jwt.verify(token, process.env.SECRET_KEY);
      next();
    } catch (error) {
      res.status(401).send("Token tidak valid.");
    }
  } else {
    res.status(401).send("Anda belum login (tidak ada otorisasi).");
  }
}
app.get("/api/get-users",async (req,res)=>{
  const result = await connection.query("SELECT * FROM users");
  res.json(result);
});
app.post("/api/login", async (req, res) => {
  const result = await connection.query("SELECT * FROM users WHERE username = ?", [
    req.body.username,
  ]);
  if (result.length > 0) {
    const user = result;
    if (await argon2.verify(user[0].password, req.body.password)) {
      const token = jwt.sign(user[0], process.env.SECRET_KEY);
      res.json({
        token,
        message: "Login berhasil.",
        role:user[0].role
      });
    } else {
      res.status(401).send("Kata sandi salah.");
    }
  } else {
    res.status(404).send(`Pengguna dengan nama pengguna ${req.body.username} tidak ditemukan.`);
  }
});
app.post("/api/register", async (req, res) => {
    try {
        const hash = await argon2.hash(req.body.password);
        // console.log("ini adalah username: " + req.body.username);
        
        const result = await connection.query(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            [req.body.username, hash, "user"]
        );
        
        const results = await connection.query("SELECT * FROM users WHERE role = ?", ["admin"]);
        if (results.length === 0) {
            const encode = await argon2.hash("admin");
            await connection.query(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
                ["admin@gmail.com", encode, "admin"]
            );
        }
        
        res.send("Pendaftaran berhasil");
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).send("Terjadi kesalahan saat pendaftaran");
    }
});


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.post('/api/post-film',authenticateToken, upload.single('video'), async (req, res) => {
  try {
    const { judul_film, artist, rilis, id_type, image } = req.body;
    const videoFilename = req.file ? req.file.filename : null;
    await connection.query(
      "INSERT INTO film (judul_film, artist, rilis, id_type, image, video) VALUES (?, ?, ?, ?, ?, ?)",
      [judul_film, artist, rilis, id_type, image, videoFilename]
    );
    
    res.status(201).json({ message: 'Film uploaded successfully!' });
  } catch (error) {
    console.error("Failed to upload film:", error);
    res.status(500).json({ message: 'Failed to upload film' });
  }
});
app.get("/api/get-film/:id",authenticateToken, async (req, res) => {
  const filmId = req.params.id;
  try {
    const [results] = await connection.query(
      "SELECT * FROM film WHERE id_film = ?",
      [filmId]
    );
    if (results.length === 0) {
      return res.status(404).json({ message: "Film not found" });
    }
    res.json(results);
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/post-genre",authenticateToken, async (req, res) => {
  await connection.query("INSERT INTO genre(genre) values (?)", [
    req.body.genre,
  ]);
  res.send("Berhasil Menambah Genre");
});

app.get("/api/get-genre",authenticateToken,async(req,res)=>{
  const results = await connection.query("SELECT * FROM genre");
  res.json(results);
});
app.get("/api/get-genre-by-id/:id",authenticateToken,async(req,res)=>{
  const result = await connection.query("SELECT * FROM genre WHERE id_type = ?",[req.params.id]);
  console.log(result);
  res.json(result);
})
app.get("/api/get-all-films",authenticateToken,async(req,res)=>{
  const results = await connection.query("SELECT * FROM film");
  console.log(results);
  res.json(results);
});
app.put("/api/update-genre/:id",authenticateToken,async(req,res)=>{
  console.log(req.params.id);
  await connection.query("UPDATE genre SET genre = ? WHERE id_type = ?",[req.body.genre,req.params.id]);
  res.send("success");
})
app.put("/api/update-film/:id",authenticateToken,async(req,res)=>{
  await connection.query("UPDATE film SET judul_film = ?,artist = ?,rilis = ?,id_type = ?,image = ? WHERE id_film = ?",[req.body.judul_film,req.body.artist,req.body.rilis,req.body.id_type,req.body.image,req.params.id]);
  res.send("success");
});
app.delete("/api/delete-genre/:id",authenticateToken,async(req,res)=>{
  await connection.query("DELETE FROM genre WHERE id_type = ?",[req.params.id]);
  res.send("success");
})
app.delete("/api/delete-film/:id",authenticateToken,async(req,res)=>{
  await connection.query("DELETE FROM film WHERE id_film = ?",[req.params.id]);
  res.send("Success");
});
app.get("/api/get-film-by-genre/:id",authenticateToken,async(req,res)=>{
  const results = await connection.query("SELECT * FROM film WHERE id_type = ?",[req.params.id]);
  res.json(results);
});
app.get("/api/search/:param",authenticateToken,async (req, res) => {
  try {
    const result = await connection.query(
      "SELECT * FROM film WHERE id_film LIKE ? OR judul_film LIKE ? OR artist LIKE ? OR rilis LIKE ? OR id_type LIKE ?",
      [`%${req.params.param}%`,`%${req.params.param}%`,`%${req.params.param}%`,`%${req.params.param}%`,`%${req.params.param}%`]
    );
    console.log(result);
    res.send(result);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).send("An error occurred while searching for films.");
  }
});

app.listen(3000, () => {
  console.log("Server berjalan di port 3000");
});