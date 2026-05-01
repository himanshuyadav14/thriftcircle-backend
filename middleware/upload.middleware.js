const multer = require('multer');

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxSize = 5 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  if (allowed.has(file.mimetype)) return cb(null, true);
  cb(new Error('Only jpg, png and webp images are allowed'));
};

const limits = { fileSize: maxSize };

const uploadSingle = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits,
}).single('avatar');

const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits,
}).array('images', 5);

const wrapUpload = (mw) => (req, res, next) =>
  mw(req, res, (err) => {
    if (err) {
      return require('../utils/apiResponse').error(res, err.message || 'Upload error', 400);
    }
    next();
  });

module.exports = { uploadSingle, uploadMultiple, wrapUpload, maxSize };
