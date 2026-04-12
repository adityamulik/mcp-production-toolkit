import { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.GATEWAY_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-key';

// Load user credentials from environment variables
// Format: DEVELOPER_EMAIL, DEVELOPER_PASSWORD, etc.
const users = {
  [process.env.DEVELOPER_EMAIL || 'developer']: {
    password: process.env.DEVELOPER_PASSWORD || 'dev123',
    role: 'developer',
    email: process.env.DEVELOPER_EMAIL || 'developer@company.com'
  },
  [process.env.ADMIN_EMAIL || 'admin']: {
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@company.com'
  },
  [process.env.ANALYST_EMAIL || 'analyst']: {
    password: process.env.ANALYST_PASSWORD || 'analyst123',
    role: 'analyst',
    email: process.env.ANALYST_EMAIL || 'analyst@company.com'
  },
  [process.env.DEPLOYER_EMAIL || 'deployer']: {
    password: process.env.DEPLOYER_PASSWORD || 'deploy123',
    role: 'deployer',
    email: process.env.DEPLOYER_EMAIL || 'deployer@company.com'
  }
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
