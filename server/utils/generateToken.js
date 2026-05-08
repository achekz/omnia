// Role du fichier: fournit des fonctions utilitaires partagees.
import jwt from 'jsonwebtoken';

// Role: Decrit la logique generateAccessToken.
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
};

// Role: Decrit la logique generateRefreshToken.
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};
