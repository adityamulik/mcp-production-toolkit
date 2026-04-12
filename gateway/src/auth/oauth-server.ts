import { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// Mock user database

const users = {
  'developer': { password: 'dev123', role: 'developer', email: 'developer@company.com' },
  'admin': { password: 'admin123', role: 'admin', email: 'admin@company.com' },
  'analyst': { password: 'analyst123', role: 'analyst', email: 'analyst@company.com' },
  'deployer': { password: 'deploy123', role: 'deployer', email: 'deployer@company.com' }
};

export function setupAuth(app: Express) {
  app.post('/auth/token', (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    const user = (users as any)[email];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { email, role: user.role, userId: email },
      SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ access_token: token });
  });
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    const decoded = jwt.verify(token, SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
