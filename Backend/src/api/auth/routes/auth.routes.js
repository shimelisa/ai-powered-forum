import express from "express";
import { registerController } from "../controller/auth.controller.js";
import { registerValidation } from "../validations/auth.validation.js";

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/register", registerValidation, registerController);

export default router;
