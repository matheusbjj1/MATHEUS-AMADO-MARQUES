import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve static files from public folder explicitly
  app.use(express.static(path.join(process.cwd(), "public")));

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Explicit PDF serving for the manual
  app.get("/manual.pdf", (req, res) => {
    const publicPath = path.join(process.cwd(), "public", "manual.pdf");
    const distPath = path.join(process.cwd(), "dist", "manual.pdf");
    const filePath = fs.existsSync(publicPath) ? publicPath : distPath;

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="manual.pdf"');
      res.sendFile(filePath);
    } else {
      res.status(404).send("Documento não encontrado");
    }
  });

  // Fallback for other PDFs if needed
  app.get(["/guia-vendas.pdf", "/guia-comercial.pdf", "/ebook.pdf"], (req, res) => {
    res.redirect("/manual.pdf");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
