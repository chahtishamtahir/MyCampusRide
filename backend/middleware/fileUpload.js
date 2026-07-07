const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '..', 'uploads');
const licensesDir = path.join(uploadBaseDir, 'licenses');
const profilesDir = path.join(uploadBaseDir, 'profiles');
const feeReceiptsDir = path.join(uploadBaseDir, 'fee-receipts');

[licensesDir, profilesDir, feeReceiptsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Sanitize filename
const sanitize = (str) => str.replace(/[^a-zA-Z0-9_-]/g, '_');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'drivingLicense') {
            cb(null, licensesDir);
        } else if (file.fieldname === 'profilePicture') {
            cb(null, profilesDir);
        } else if (file.fieldname === 'feeReceipt') {
            cb(null, feeReceiptsDir);
        } else {
            cb(new Error('Invalid field name'), false);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        // Format: fieldname_timestamp_sanitizedName.ext
        const name = sanitize(req.body.name || 'unknown');
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `${file.fieldname}_${timestamp}_${name}${ext}`;
        cb(null, filename);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'drivingLicense') {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed for driving license'), false);
        }
    } else if (file.fieldname === 'profilePicture') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed for profile picture'), false);
        }
    } else if (file.fieldname === 'feeReceipt') {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF or image files (JPEG, PNG, WEBP) are allowed for fee receipt'), false);
        }
    } else {
        cb(new Error('Unexpected field'), false);
    }
};

// Create multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

module.exports = upload;
