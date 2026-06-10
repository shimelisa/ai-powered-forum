import { StatusCodes } from "http-status-codes";
import {
  createQuestionWithVectorService,
  searchQuestionsSemanticService,
} from "../service/question.service.js";

export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const result = await createQuestionWithVectorService({
      userId: req.user.id,
      title,
      content,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Question posted successfully.",
      data: {
        id: result.question.id,
        questionHash: result.question.questionHash,
        title: result.question.title,
        content: result.question.content,
        userId: result.question.userId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/questions/search
 * Performs semantic (vector) search over questions using cosine similarity.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */

export const searchQuestionsSemanticController = async (req, res, next) => {
  try {
    const result = await searchQuestionsSemanticService({
      query: req.query.query,
      k: req.query.k ? Number(req.query.k) : 5,
      threshold:
        req.query.threshold !== undefined
          ? Number(req.query.threshold)
          : undefined,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Semantic search completed successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
