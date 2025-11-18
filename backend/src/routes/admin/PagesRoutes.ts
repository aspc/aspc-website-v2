import express, { Request, Response } from 'express';
import PageContent from '../../models/PageContent';
import { isAdmin, isAuthenticated } from '../../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   GET /api/admin/pages
 * @desc    Get all pages
 * @access  isAuthenticated
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
 * @access  isAuthenticated
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

        if (!id || !name || !header || (!link && !content)) {
            res.status(400).json({
                message:
                    'id, name, and header are required, and either link or content must be provided',
            });
            return;
        }

        // Make sure only link or content is provided (Either link to a google doc or content for a static page)
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

export default router;
