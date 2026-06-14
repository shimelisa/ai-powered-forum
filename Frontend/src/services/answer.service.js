// Frontend/src/services/answer.service.js
export const postAnswer = async (questionId, content) => {
  // Mock response
  return {
    id: Date.now(),
    content: content,
    author: { firstName: "You", lastName: "" },
    createdAt: new Date().toISOString(),
  };
};