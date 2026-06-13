import express from "express";
import authRoutes from "./auth/routes/auth.routes.js";
import {questionRoutes} from "./question/routes/question.routes.js"; 
// import { js } from "@eslint/js";
import answersRoutes  from "./answers/routes/answer.routes.js";

export const mainRouter = express.Router();

// Authentication routes
mainRouter.use("/auth", authRoutes);
mainRouter.use("/questions", questionRoutes);
mainRouter.use("/answers", answersRoutes);
