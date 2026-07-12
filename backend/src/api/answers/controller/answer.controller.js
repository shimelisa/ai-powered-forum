import { StatusCodes } from "http-status-codes";
import {
  createAnswerService,
  deleteAnswerService,
  getAnswersService,
  updateAnswerService,
} from "../service/answer.service.js";

/**
 * POST /api/answers
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */

export const createAnswerController = async (req, res) => {
  try {
    const { questionId, content } = req.body;
    const userId = req.user.id;
    const newAnswer = await createAnswerService(content, questionId, userId);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Answer posted successfully",
      data: newAnswer,
    });
  } catch (error) {
    console.error("Error creating answer:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to create answer" });
  }
};

export const getAnswersController = async (req, res) => {
  try {
    const { questionId, sortBy } = req.query;
    const answers = await getAnswersService({ questionId, sortBy });
    res.status(StatusCodes.OK).json({ answers });
  } catch (error) {
    console.error("Error fetching answers:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to fetch answers" });
  }
};

export const getSingleAnswerController = async (req, res) => {
  try {
    const { id } = req.params;
    const answer = await getAnswersService(id);
    if (!answer) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Answer not found" });
    }
    res.status(StatusCodes.OK).json({ answer });
  } catch (error) {
    console.error("Error fetching answer:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to fetch answer" });
  }
};

export const updateAnswerController = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const updatedAnswer = await updateAnswerService(id, content, userId);
    if (!updatedAnswer) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Answer not found or unauthorized" });
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Answer updated successfully", answer: updatedAnswer });
  } catch (error) {
    console.error("Error updating answer:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to update answer" });
  }
};

export const deleteAnswerController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const deleted = await deleteAnswerService(id, userId);
    if (!deleted) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Answer not found or unauthorized" });
    }
    res.status(StatusCodes.OK).json({ message: "Answer deleted successfully" });
  } catch (error) {
    console.error("Error deleting answer:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to delete answer" });
  }
};
