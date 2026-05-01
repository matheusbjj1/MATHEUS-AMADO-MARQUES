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

  // Explicit PDF serving for the manual with EXTREME priority
  app.get("/manual.pdf", (req, res) => {
    const publicPath = path.join(process.cwd(), "public", "manual.pdf");
    const distPath = path.join(process.cwd(), "dist", "manual.pdf");
    const filePath = fs.existsSync(publicPath) ? publicPath : distPath;

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="manual.pdf"');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(filePath);
    } else {
      res.status(404).send("PDF não encontrado no servidor - Verifique se o arquivo manual.pdf está na pasta public");
    }
  });

  // Explicit Image serving for profile.png
  app.get("/profile.png", (req, res) => {
    const publicPath = path.join(process.cwd(), "public", "profile.png");
    const distPath = path.join(process.cwd(), "dist", "profile.png");
    const filePath = fs.existsSync(publicPath) ? publicPath : distPath;

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(filePath);
    } else {
      res.status(404).send("Imagem não encontrada");
    }
  });

  // Serve static files from public folder
  app.use(express.static(path.join(process.cwd(), "public")));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
