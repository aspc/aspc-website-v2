import express, { Request, Response } from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import Staff from '../models/Staff';
import { bucket } from '../server';

const router = express.Router();

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });


// Get all ids and names
router.get('/', async (req: Request, res: Response) => {
  try {
    const staff = await Staff.find();
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

    if (!staff) {
      res.status(404).json({ message: 'Members not found' });
      return;
    }
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Post request to add a staff
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
      // After uploading the file, create a new member with the file reference
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

// Change staff info
router.put('/:id', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file && !req.body) {
      res.status(400).json({ message: 'Must update at least one field'});
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
      const newPictureId = await new Promise<ObjectId>((resolve, reject) => { 
        // Upload new picture to GridFS
        const uploadStream = bucket.openUploadStream(newFile.originalname, {
          contentType: newFile.mimetype,
        });

        uploadStream.end(newFile.buffer);

        uploadStream.on('finish', () => {
          resolve(uploadStream.id); 
        });
      
        uploadStream.on('error', (err) => {
          reject(err);
        });
      });

      updateData = { ...updateData, profilePic: newPictureId };
    }

    const updatedMember = await Staff.findOneAndUpdate({ id: id }, updateData, { new: true });
    res.status(200).json({ message: 'Member profile updated', updatedMember });

  } catch (error) {
    console.error("update error: ", error);
    res.status(400).json({ message: 'Error updating member' });
  }
});


export default router;