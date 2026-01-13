import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import adminUsersRouter from "./routes/adminUsers.js";
import reportRoutes from "./routes/report.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", adminUsersRouter);
app.use("/api/admin/report", reportRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Backend rodando na porta ${port}`));
