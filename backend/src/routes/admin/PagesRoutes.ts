import express, { Request, Response } from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import PageContent from '../../models/PageContent';
import { pagePdfs } from '../../server';
import { isAdmin, isAuthenticated } from '../../middleware/authMiddleware';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            cb(new Error('Only PDF files are allowed'));
        } else {
            cb(null, true);
        }
    },
});

/**
 * @route   GET /api/admin/pages
 * @desc    Get all pages
 * @access
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const pages = await PageContent.find({});
        res.json(pages);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/admin/pages/:id
 * @desc    Get page by id
 * @access  isAuthenticated
 */
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const page = await PageContent.findOne({ id });

        if (!page) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }

        res.json(page);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/admin/pages/:header
 * @desc    Get pages by header
 * @access
 */
router.get('/header/:header', async (req: Request, res: Response) => {
    try {
        const { header } = req.params;
        const pages = await PageContent.find({ header });
        res.json(pages);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/admin/pages
 * @desc    Create a new page
 * @access  isAdmin
 */
router.post('/', isAdmin, async (req: Request, res: Response) => {
    try {
        const { id, name, content, header, link } = req.body;

        if (!id || !name || !header) {
            res.status(400).json({
                message: 'id, name, and header are required',
            });
            return;
        }

        if (link && content) {
            res.status(400).json({
                message:
                    "Only one of 'link' or 'content' should be provided, not both.",
            });
            return;
        }

        const newPage = new PageContent({
            id,
            name,
            header,
            content: content ?? null,
            link: link ?? null,
            pdfId: null,
        });
        await newPage.save();

        res.status(201).json({ message: 'Page successfully created' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   PUT /api/admin/pages/:id
 * @desc    Update an existing page
 * @access  isAdmin
 */
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { newId, name, content, header, link } = req.body;

        if (!name && !content && !header && !link) {
            res.status(400).json({
                message:
                    'At least one field is required (name, content, header or link)',
            });
            return;
        }

        // Update only the fields that are provided
        const updateData: any = {};
        if (newId) updateData.id = newId;
        if (name) updateData.name = name;
        if (content) updateData.content = content;
        if (header) updateData.header = header;
        if (link) updateData.link = link;

        const page = await PageContent.findOneAndUpdate({ id }, updateData, {
            new: true,
        });

        if (!page) {
            res.status(404).json('Page not found');
            return;
        }

        res.json({ message: 'Page successfully updated', page });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   DELETE /api/admin/pages/:id
 * @desc    Delete a page by id
 * @access  isAdmin
 */
router.delete('/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const page = await PageContent.findOneAndDelete({ id });

        if (!page) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }

        res.status(200).json({ message: 'Page deleted', page });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/admin/pages/:id/pdf
 * @desc    Upload a PDF for a page
 * @access  isAdmin
 */
router.post(
    '/:id/pdf',
    isAdmin,
    upload.single('file'),
    async (req: Request, res: Response) => {
        if (!req.file) {
            res.status(400).json({ message: 'No PDF file uploaded' });
            return;
        }

        try {
            const { id } = req.params;
            const page = await PageContent.findOne({ id });

            if (!page) {
                res.status(404).json({ message: 'Page not found' });
                return;
            }

            // Delete existing PDF from GridFS if one already exists
            if (page.pdfId) {
                await pagePdfs.delete(new ObjectId(page.pdfId));
            }

            // Upload new PDF to GridFS
            const newPdfId = await new Promise<ObjectId>((resolve, reject) => {
                const uploadStream = pagePdfs.openUploadStream(
                    req.file!.originalname,
                    { contentType: 'application/pdf' }
                );
                uploadStream.end(req.file!.buffer);
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            await PageContent.findOneAndUpdate({ id }, { pdfId: newPdfId });

            req.file = undefined;
            res.status(201).json({
                message: 'PDF uploaded successfully',
                pdfId: newPdfId,
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   GET /api/admin/pages/:id/pdf
 * @desc    Stream the PDF for a page
 * @access  public
 */
router.get('/:id/pdf', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const page = await PageContent.findOne({ id });

        if (!page) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }

        if (!page.pdfId) {
            res.status(404).json({ message: 'No PDF attached to this page' });
            return;
        }

        const fileId = new ObjectId(page.pdfId);
        const files = await pagePdfs.find({ _id: fileId }).toArray();

        if (!files.length) {
            res.status(404).json({ message: 'PDF not found in storage' });
            return;
        }

        res.set('Content-Type', 'application/pdf');
        res.set(
            'Content-Disposition',
            `inline; filename="${files[0].filename}"`
        );

        const downloadStream = pagePdfs.openDownloadStream(fileId);
        downloadStream.pipe(res);
        downloadStream.on('error', () => {
            res.status(500).json({ message: 'Error retrieving PDF' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   DELETE /api/admin/pages/:id/pdf
 * @desc    Remove the PDF from a page
 * @access  isAdmin
 */
router.delete('/:id/pdf', isAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const page = await PageContent.findOne({ id });

        if (!page) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }

        if (!page.pdfId) {
            res.status(404).json({ message: 'No PDF attached to this page' });
            return;
        }

        await pagePdfs.delete(new ObjectId(page.pdfId));
        await PageContent.findOneAndUpdate({ id }, { pdfId: null });

        res.status(200).json({ message: 'PDF deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
