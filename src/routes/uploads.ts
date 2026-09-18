import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { authenticateToken } from './auth';

export const uploadsRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const safeName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// POST /api/uploads - Upload file via FormData
uploadsRouter.post('/', authenticateToken, upload.single('image'), (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { leadId, caption, isPrimary } = req.body;

  if (!leadId) {
    return res.status(400).json({ error: 'leadId is required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const fileUrl = `/data/uploads/${req.file.filename}`;

  const imageObj = db.addImage({
    leadId,
    objectKey: req.file.filename,
    url: fileUrl,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    uploadedBy: reqUser.id,
    caption: caption || '',
    isPrimary: isPrimary === 'true' || isPrimary === true
  });

  return res.status(201).json({ image: imageObj });
});

// POST /api/uploads/clipboard - Upload base64 image pasted directly from clipboard
uploadsRouter.post('/clipboard', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { leadId, base64Data, filename, caption } = req.body;

  if (!leadId || !base64Data) {
    return res.status(400).json({ error: 'leadId and base64Data are required' });
  }

  try {
    // Extract mime type and clean base64 string
    const matches = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = mimeType.split('/')[1] || 'png';

    const safeFilename = filename || `pasted_image_${Date.now()}.${ext}`;
    const key = `pasted_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, key);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/data/uploads/${key}`;

    const imageObj = db.addImage({
      leadId,
      objectKey: key,
      url: fileUrl,
      filename: safeFilename,
      mimeType,
      fileSize: buffer.length,
      uploadedBy: reqUser.id,
      caption: caption || 'Pasted from clipboard'
    });

    return res.status(201).json({ image: imageObj });
  } catch (err: any) {
    console.error('Clipboard image save error:', err);
    return res.status(500).json({ error: 'Failed to save pasted clipboard image' });
  }
});

// DELETE /api/uploads/:id - Delete image
uploadsRouter.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const ok = db.deleteImage(req.params.id, reqUser.id);
  if (!ok) {
    return res.status(404).json({ error: 'Image not found' });
  }
  return res.json({ success: true, message: 'Image deleted' });
});
