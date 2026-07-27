import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.post('/api/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin@cbtschool.com';
    const adminPass = process.env.ADMIN_PASSWORD || '4121Wijaya*@?';

    if (email === adminUser && password === adminPass) {
      // Set a secure, httpOnly cookie
      res.cookie('admin_session', 'true', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      return res.json({ success: true });
    }

    res.status(401).json({ success: false, message: 'Invalid credentials' });
  });

  app.get('/api/check-auth', (req: Request, res: Response) => {
    if (req.cookies.admin_session === 'true') {
      return res.json({ authenticated: true });
    }
    res.json({ authenticated: false });
  });

  app.post('/api/logout', (req: Request, res: Response) => {
    res.clearCookie('admin_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
