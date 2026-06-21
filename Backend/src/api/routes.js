import express from "express";
import authRoutes from "./auth/routes/auth.routes.js";
import questionRoutes from "./question/routes/question.routes.js"; 
import answersRoutes  from "./answers/routes/answer.routes.js";
import ragRoutes from "./rag/routes/rag.routes.js";



export const mainRouter = express.Router();

// Authentication routes
mainRouter.use("/auth", authRoutes);

// Question routes (includes GET /api/questions)
mainRouter.use("/questions", questionRoutes);

// Answers routes (includes GET /api/answers)
mainRouter.use("/answers", answersRoutes);

// RAG routes (includes GET/api/rag)
mainRouter.use("/rag/documents", ragRoutes);

