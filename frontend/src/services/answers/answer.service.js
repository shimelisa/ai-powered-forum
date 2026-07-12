// Frontend/src/services/answer.service.js
import { apiClient } from "../core/api.client";

/**
 * Post a new answer to a question
 * POST /api/answers
 */
// answer.service.js

export const postAnswer = async (payload) => {
  const response = await apiClient.post("/api/answers", payload);
  return response.data;
};
