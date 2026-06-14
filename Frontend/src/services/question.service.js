// // Frontend/src/services/question.service.js
// // // Temporary mock version – replace with real API calls later
// // export const getSingleQuestion = async (questionHash) => {
// //   // Mock data – remove when backend is ready
// //   return {
// //     question: {
// //       id: 1,
// //       title: "How to fix CORS error?",
// //       content: "I have React on port 3000 and Express on 5000...",
// //       author: { id: 2, firstName: "Test", lastName: "User" },
// //       createdAt: new Date().toISOString(),
// //     },
// //     answers: [
// //       {
// //         id: 101,
// //         content: "Install `cors` middleware and use `app.use(cors())`",
// //         author: { firstName: "Helper", lastName: "Bot" },
// //         createdAt: new Date().toISOString(),
// //       },
// //     ],
// //     answersMeta: { total: 1 },
// //   };
// // };

// export async function getSingleQuestion(questionHash) {
//   try {
//     const response = await apiClient.get(`/api/questions/${questionHash}`);
//     return response.data.data || response.data;
//   } catch (error) {
//     throw handleQuestionError(error);
//   }
// }

// export const assessAnswerFit = async (questionHash, answerText) => {
//   // Mock response
//   return {
//     data: {
//       level: "strong",
//       note: "Your answer looks relevant and addresses the question well.",
//     },
//   };
// };

import { apiClient } from "./core/api.client";

/**
 * Get single question with answers
 * GET /api/questions/:questionHash
 */
export const getQuestionDetail = async (questionHash) => {
  const response = await apiClient.get(`/api/questions/${questionHash}`);

  return response.data;
};

/**
 * AI Answer Fit Check
 * POST /api/questions/:questionHash/answer-fit
 */
export const assessAnswerFit = async (questionHash, answerText) => {
  const response = await apiClient.post(
    `/api/questions/${questionHash}/answer-fit`,
    {
      answerText,
    },
  );

  return response.data;
};