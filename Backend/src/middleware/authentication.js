import jwt from "jsonwebtoken";
import { UnauthenticatedError } from "../utils/errors/index.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const authenticateUser = (req, res, next) => {
  console.log('🔐 Authentication middleware called');
  console.log('Headers:', req.headers);
  
  const authHeader = req.headers.authorization;
  console.log('Auth Header:', authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ No Bearer token found');
    throw new UnauthenticatedError("Authentication invalid");
  }

  const token = authHeader.split(" ")[1];
  console.log('Token:', token);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified:', payload);
    req.user = {
      id: payload.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    throw new UnauthenticatedError("Authentication invalid");
  }
};