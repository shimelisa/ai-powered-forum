import {
  createQuestionWithVectorService,
  getQuestionsService,
  getSimilarQuestionsService,
  getSingleQuestionService,
  searchQuestionsSemanticService,
  
} from "../service/question.service.js";
import {
  generateQuestionDraftCoachService,
  assessAnswerAgainstQuestionService,
} from "../service/geminiTextCoach.service.js";
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

/**
 * GET /api/questions
 * 
 * List questions with optional search and mine filters.
 */
export const getQuestionsController = async (req, res, next) => {
  try {
    const { search, mine } = req.query;

    const filters = {
      search,
      mine,
      userId: req.user.id,
    };

    const result = await getQuestionsService(filters);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Questions fetched successfully.",
      ...result,
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

/**
 * POST /api/questions/draft-coach
 */
export const generateQuestionDraftCoachController = async (req, res, next) => {
  try {
    const { title = "", content } = req.body;

    const result = await generateQuestionDraftCoachService({
      title,
      content,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Draft suggestions generated",
      data: result,
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

/**
 * Handles requests to retrieve details for a single question.
 *
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 * @param {import('express').NextFunction} next The Express next function.
 * @returns {Promise<void>}
 */
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

/**
 * Handles AI relevance assessment of an answer draft against a question.
 */
// export const assessAnswerAgainstQuestionController = async (req, res, next) => {
//   try {
//     const { questionHash } = req.params;
//     const { answerText } = req.body;
//     const { question } = await getSingleQuestionService({
//       questionHash,
//       includeAnswers: false,
//     });
//     const data = await assessAnswerAgainstQuestionService({
//       questionTitle: question.title,
//       questionContent: question.content,
//       answerText,
//     });
//     res.status(StatusCodes.OK).json({
//       success: true,
//       message: "Answer fit assessed.",
//       data,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const assessAnswerAgainstQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;

    if (!questionHash) {
      return res.status(400).json({
        success: false,
        message: "questionHash is missing in params",
      });
    }

    if (!answerText) {
      return res.status(400).json({
        success: false,
        message: "answerText is missing in request body",
      });
    }

    const { question } = await getSingleQuestionService({
      questionHash,
      includeAnswers: false,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const data = await assessAnswerAgainstQuestionService({
      questionTitle: question.title,
      questionContent: question.content,
      answerText,
    });

    return res.status(200).json({
      success: true,
      message: "Answer fit assessed.",
      data,
    });
  } catch (error) {
    console.error("🔥 Controller Error:", error); // FULL ERROR LOG

    return res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};