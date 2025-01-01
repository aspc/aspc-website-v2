import express, { Request, Response } from 'express';
import session from 'express-session';
import User from '../models/User';

const router = express.Router();

// Configure session
router.use(
    session({
        secret: 'test', // Note: Should be a long string in production
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } // Note: Should be true in production
    })
)

router.get('/', async (req: Request, res: Response) => {
    try {
      const users = await User.find().select('-password'); // Exclude password field
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

// Login
router.post('/login', async (req: Request, res: Response) => {
    const {email, password} = req.body;
    
    try {
        const user = await User.findOne({ email })

        // Check if the user exists
        if (!user) {
            res.status(401).json({ message: 'The user does not exist' });
            return;
        }

        // Check if the passwords match
        // Note: in production use bcrypt.compare() to compare hashed passwords
        if (password != user.password) {
            res.status(401).json({ message: 'Invalid password' });
            return;
        }

        // Save user info in session
        (req.session as any).user = {
            email: user.email,
            name: user.name,
            isAdmin: user.is_admin
        };

        res.status(200).json({ message: 'Login successful'})

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }

    });

// Logout
router.post('/logout', async (req: Request, res: Response) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                res.status(500).json({ message: 'Unable to log out' });
            } else {
                res.status(200).json({ message: 'Logout successful' });
            }
        })
    } else {
        res.status(400).json({ message: 'You are already logged out'});
    };

});


// Get current user
router.get('/current_user', async (req: Request, res: Response) => {
    if (!(req.session as any).user) {
        res.status(401).json({ message: 'No user is logged in' });
        return;
    }

    res.status(200).json({ user: (req.session as any).user })
});

export default router;