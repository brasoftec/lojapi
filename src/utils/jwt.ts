import jwt from 'jsonwebtoken';
import { AuthPayload } from '../middlewares/auth';

export const generateToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '30d',
  } as jwt.SignOptions);
};
