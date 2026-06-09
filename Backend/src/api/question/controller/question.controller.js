import { createQuestionWithVectorService } from "../service/question.service.js";
import { StatusCodes } from "http-status-codes";

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
