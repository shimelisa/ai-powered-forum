import { 
  createQuestionWithVectorService, getSimilarQuestionsService,
  getSingleQuestionService
} from "../service/question.service.js";
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

export const getSimilarQuestionsController = async (req, res, next) => {
  try {
    const result = await getSimilarQuestionsService({
      questionHash: req.params.questionHash,
      k: req.query.k ? Number(req.query.k) : 5,
      threshold: req.query.threshold ? Number(req.query.threshold) : undefined,
    });    
    res.status(StatusCodes.OK).json({      
      success: true,
      message: "Similar questions fetched successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// Controller for getting single question details
export const getSingleQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const result = await getSingleQuestionService({
      questionHash,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Question details retrieved successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};