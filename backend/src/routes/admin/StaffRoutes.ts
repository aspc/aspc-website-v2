import express, { Request, Response } from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { Staff } from '../../models/People';
import { bucket } from '../../server';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all ids and names
router.get('/', async (req: Request, res: Response) => {
    try {
        const staff = await Staff.find({}, { id: 1, name: 1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get staff info by id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const staff = await Staff.findOne({ id: id });

        if (!staff) {
            res.status(404).json({ message: 'Member not found' });
            return;
        }
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get staff info by group
router.get('/group/:group', async (req: Request, res: Response) => {
    try {
        const { group } = req.params;
        const staff = await Staff.find({ group: group });
        staff.sort((a, b) => parseInt(a.id) - parseInt(b.id));

        if (!staff) {
            res.status(404).json({ message: 'Members not found' });
            return;
        }
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create staff member
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).send('No file uploaded');
        return;
    }

    try {
        // Upload profile picture to GridFS
        const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
        });

        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', async () => {
            // After uploading the file, create a new member with the picture's file id
            const memberData = {
                id: req.body.id,
                name: req.body.name,
                position: req.body.position,
                bio: req.body.bio,
                group: req.body.group,
                profilePic: uploadStream.id,
            };

            const member = new Staff(memberData);
            await member.save();

            req.file = undefined; // free up memory
            res.status(201).json({ message: 'Member created successfully' });
        });
    } catch (error) {
        res.status(400).json({ message: 'Error creating member' });
    }
});

// Update staff info
router.patch(
    '/:id',
    upload.single('file'),
    async (req: Request, res: Response) => {
        try {
            if (!req.file && !req.body) {
                res.status(400).json({
                    message: 'Must update at least one field',
                });
                return;
            }

            const { id } = req.params;
            const oldData = await Staff.findOne({ id: id });

            if (!oldData) {
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            let updateData = req.body;

            if (req.file) {
                const newFile = req.file;

                // Remove old picture from GridFS
                bucket.delete(oldData.profilePic);

                // Wait for file to upload to get new id before updating data
                const newPictureId = await new Promise<ObjectId>(
                    (resolve, reject) => {
                        // Upload new picture to GridFS
                        const uploadStream = bucket.openUploadStream(
                            newFile.originalname,
                            {
                                contentType: newFile.mimetype,
                            }
                        );

                        uploadStream.end(newFile.buffer);

                        uploadStream.on('finish', () => {
                            resolve(uploadStream.id);
                        });

                        uploadStream.on('error', (err) => {
                            reject(err);
                        });
                    }
                );

                updateData = { ...updateData, profilePic: newPictureId };
            }

            const updatedMember = await Staff.findOneAndUpdate(
                { id: id },
                updateData,
                { new: true }
            );
            res.status(200).json({
                message: 'Member profile updated',
                updatedMember,
            });
        } catch (error) {
            console.error('update error: ', error);
            res.status(400).json({ message: 'Error updating member' });
        }
    }
);

// Get profile picture by id
router.get('/profile-pic/:id', async (req: Request, res: Response) => {
    try {
        const fileId = new ObjectId(req.params.id);

        // Check if file exists
        const files = await bucket.find({ _id: fileId }).toArray();
        if (!files.length) {
            res.status(404).json({ message: 'Profile picture not found' });
            return;
        }

        // Set appropriate headers
        res.set('Content-Type', files[0].contentType);

        // Create download stream
        const downloadStream = bucket.openDownloadStream(fileId);

        // Pipe the file to the response
        downloadStream.pipe(res);

        downloadStream.on('error', () => {
            res.status(404).json({
                message: 'Error retrieving profile picture',
            });
        });
    } catch (error) {
        res.status(400).json({ message: 'Invalid profile picture ID' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const staff = await Staff.findOneAndDelete({ id: req.params.id });

        if (!staff) {
            res.status(404).json({ message: 'Member not found' });
        }

        res.status(200).json({ message: 'Member deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
