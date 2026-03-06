import express from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { syncController } from "../controllers/syncController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/excel", requireAdmin, upload.single("file"), syncController.importExcel);
router.get("/export-database", requireAdmin, syncController.exportDatabase);

export default router;
