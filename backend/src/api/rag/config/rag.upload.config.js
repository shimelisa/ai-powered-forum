import multer from "multer";
import path from "path";
import fs from "fs";
import { StatusCodes } from "http-status-codes";

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id;
    const uploadPath = path.join(process.cwd(), 'uploads', 'documents', String(userId));
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter - only PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Create multer instance
export const uploadRagDocument = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Error handler middleware for multer
export const createDocumentMulterErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE' || err.code === 'LIMIT_FILE_SIZE') {
     return res.status(StatusCodes.REQUEST_TOO_LONG).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Unexpected field. Please upload a single file.'
      });
    }
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  
  if (err.message === 'Only PDF files are allowed') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Only PDF files are allowed.'
    });
  }
  
  next(err);
};



export const uploadRagDocumentWithErrorHandling = (req, res, next) => {
  uploadRagDocument.single("file")(req, res, (err) => {
    if (err) {
      return createDocumentMulterErrorHandler(err, req, res, next);
    }
    next();
  });
};
