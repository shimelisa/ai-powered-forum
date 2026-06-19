import { apiClient } from "../core/api.client.js";

/**
 * Creates a new question.
 * @param {Object} formData - Question form data { title, content }
 * @returns {Promise} Response from the server
 */
async function createQuestion(formData) {
  try {
    const response = await apiClient.post("/api/questions", formData);
    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Gets all questions with optional filtering
 * @param {Object} filters - Filter options { search, mine, limit, offset }
 * @returns {Promise} Questions list with metadata
 */
async function getQuestions(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.mine) params.append("mine", "true");
    if (filters.limit) params.append("limit", filters.limit);
    if (filters.offset) params.append("offset", filters.offset);

    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/api/questions${query}`);
    return response.data.data || response.data;
  } catch (error) {
    throw handleQuestionError(error, "fetch");
  }
}

/**
 * Generates AI feedback for a question draft.
 * @param {Object} draftData - Draft data { title, content }
 * @returns {Promise} AI feedback response with tips
 */
async function generateQuestionDraftCoach(draftData) {
  try {
    const response = await apiClient.post(
      "/api/questions/draft-coach",
      draftData,
    );
    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Gets details for a single question including all answers.
 * @param {String} questionHash - The question hash
 * @returns {Promise} Question and answers data
 */
export const getQuestionDetail = async (questionHash) => {
  try {
    const response = await apiClient.get(`/api/questions/${questionHash}`);
    return response.data || response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
};

/**
 * Creates a new answer to a question.
 * @param {Object} answerData - Answer data { questionHash, content }
 * @returns {Promise} Created answer response
 */
async function createAnswer(answerData) {
  try {
    const response = await apiClient.post("/api/answers", answerData);
    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

export const assessAnswerFit = async (questionHash, answerText) => {
  try {
    const response = await apiClient.post(
      `/api/questions/${questionHash}/answer-fit`,
      {
        answerText,
      },
    );

    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
};

/**
 * Performs semantic (AI-powered) search over questions.
 * @param {String} query - Search query string
 * @param {Object} options - Search options { k, threshold }
 * @returns {Promise} Semantically similar questions
 */
async function searchQuestionsSemantic(query, options = {}) {
  try {
    const params = new URLSearchParams();
    params.append("query", query);
    if (options.k) params.append("k", options.k);
    if (options.threshold) params.append("threshold", options.threshold);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/api/questions/search${queryString}`);
    return response.data.data || response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Centralized error handler for question service requests.
 */
function handleQuestionError(error, action = "fetch") {
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return new Error("Request timed out. Please try again.");
    }
    if (error.code === "ENOTFOUND") {
      return new Error("Server address not found. Check your configuration.");
    }
    return new Error(
      "Unable to connect to server. Please check your internet connection.",
    );
  }

  const status = error.response.status;
  const backendMessage =
    error.response.data?.msg || error.response.data?.message;

  // For fetch operations, return early with simple message
  if (action === "fetch") {
    return new Error(backendMessage || "Failed to fetch questions.");
  }

  // For create operations, handle specific status codes
  if (action === "create") {
    switch (status) {
      case 400:
        return new Error(backendMessage || "Invalid input data.");
      case 401:
        return new Error("Please log in to create a question.");
      case 500:
        return new Error(
          "Something went wrong on our end. Please try again later.",
        );
      default:
        return new Error(backendMessage || "An unexpected error occurred.");
    }
  }

  return new Error(backendMessage || "An error occurred.");
}
/**
 * Service for handling question-related requests.
 */
export const questionService = {
  createQuestion,
  getQuestions,
  generateQuestionDraftCoach,
  // getQuestionDetail,
  createAnswer,
  searchQuestionsSemantic,
};

/**
 * Fetch related questions for a given question hash.
 * GET /api/questions/:questionHash/related
 *
 * If your backend doesn't have this endpoint yet, the component
 * handles the failure gracefully (shows empty sidebar).
 */
export const getRelatedQuestions = async (questionHash) => {
  const response = await apiClient.get(`/api/questions/${questionHash}/similar`);
  return response.data;
};