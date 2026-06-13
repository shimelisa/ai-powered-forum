import { 
  createQuestionWithVectorService, getSimilarQuestionsService,
  getSingleQuestionService, searchQuestionsSemanticService,
} from "../service/question.service.js";
import {
  generateQuestionDraftCoachService,
} from "../service/geminiTextCoach.service.js";


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

/**
 * Handles AI relevance assessment of an answer draft against a question.
 */
export const assessAnswerAgainstQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;
    const { question } = await getSingleQuestionService({
      questionHash,
      includeAnswers: false,
    });
    const data = await assessAnswerAgainstQuestionService({
      questionTitle: question.title,
      questionContent: question.content,
      answerText,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Answer fit assessed.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

