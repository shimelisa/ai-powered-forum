import  {body, param, query}  from 'express-validator';
import  {validationErrorHandler} from '../../../middleware/validation-handler.js';

export const createAnswerValidation = [
body ('questionId')
     .notEmpty()
     .withMessage('Question id is required')
     .isInt({ min: 1 })
     .withMessage("question id must be a positive integer"),

body ('content')
     .notEmpty()
     .withMessage('Answer content is required')
     .isString()
     .withMessage('Answer content must be a string')
     .isLength({ min: 20 })
     .withMessage('Answer content must be at least 20 characters')
     .trim(),
validationErrorHandler,
];

export const getAnswersValidation =[
query('questionId')
    .notEmpty()
    .withMessage('Question id is required')
    .isInt({ min: 1 })
    .withMessage('Question id must be a positive integer'),
query('sortBy')
    .optional()
    .isIn(['newest', 'oldest'])
    .withMessage('sortBy must be either newest or oldest'),

validationErrorHandler,
]

export const answerIdValidation = [
param('id')
    .notEmpty()
    .withMessage('Answer id is required')
    .isInt({ min: 1 })
    .withMessage('Answer id must be a positive integer'),
validationErrorHandler,
];

export const updateAnswerValidation = [
param('id')
    .notEmpty()
    .withMessage('Answer id is required')
    .isInt({ min: 1 })
    .withMessage('Answer id must be a positive integer'),
body('content')
    .optional()
    .isString()
    .withMessage('Answer content must be a string')
    .isLength({ min: 20 })
    .withMessage('Answer content must be at least 20 characters')
    .trim(),
validationErrorHandler,
];

export const deleteAnswerValidation = [
param('id')
    .notEmpty()
    .withMessage('Answer id is required')
    .isInt({ min: 1 })
    .withMessage('Answer id must be a positive integer'),
validationErrorHandler,
];

