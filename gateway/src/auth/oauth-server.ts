import { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.GATEWAY_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-key';

// Load user credentials exclusively from environment variables
// All credentials must be provided via .env.local or environment
const requiredEnvVars = [
  'DEVELOPER_EMAIL', 'DEVELOPER_PASSWORD',
  'ADMIN_EMAIL', 'ADMIN_PASSWORD',
  'ANALYST_EMAIL', 'ANALYST_PASSWORD',
  'DEPLOYER_EMAIL', 'DEPLOYER_PASSWORD'
];

// Validate all required environment variables are set
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('Please set credentials in .env.local before starting the server');
}

const users = {
  [process.env.DEVELOPER_EMAIL!]: {
    password: process.env.DEVELOPER_PASSWORD!,
    role: 'developer',
    email: process.env.DEVELOPER_EMAIL!
  },
  [process.env.ADMIN_EMAIL!]: {
    password: process.env.ADMIN_PASSWORD!,
    role: 'admin',
    email: process.env.ADMIN_EMAIL!
  },
  [process.env.ANALYST_EMAIL!]: {
    password: process.env.ANALYST_PASSWORD!,
    role: 'analyst',
    email: process.env.ANALYST_EMAIL!
  },
  [process.env.DEPLOYER_EMAIL!]: {
    password: process.env.DEPLOYER_PASSWORD!,
    role: 'deployer',
    email: process.env.DEPLOYER_EMAIL!
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
