import express from 'express';
import axios from 'axios';

const router = express.Router();

// ml-service runs as a second container in the same Lightsail deployment as
// this backend, reachable only via localhost — not publicly exposed on its
// own. This router is the one public door to it, for external callers like
// p-ickup/frontend (which has no other way to reach it).
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const mlServiceHeaders = () =>
    process.env.ML_SERVICE_API_KEY
        ? { 'X-API-Key': process.env.ML_SERVICE_API_KEY }
        : {};

// Status check — intentionally no API key required, mirrors ml-service's own
// open GET / (just reports configured/reachable, nothing sensitive).
router.get('/', async (req, res) => {
    try {
        const response = await axios.get(ML_SERVICE_URL, {
            headers: mlServiceHeaders(),
            timeout: 5000,
        });
        res.json(response.data);
    } catch (error) {
        console.error('ml-service unreachable:', error);
        res.status(502).json({
            message: 'Could not reach the matching service.',
        });
    }
});

router.post('/match', async (req, res) => {
    const expectedKey = process.env.ML_PROXY_API_KEY;
    if (!expectedKey) {
        res.status(503).json({
            message: 'ML_PROXY_API_KEY is not configured on the server.',
        });
        return;
    }
    if (req.headers['x-api-key'] !== expectedKey) {
        res.status(401).json({
            message: 'Missing or invalid X-API-Key header.',
        });
        return;
    }

    try {
        const response = await axios.post(`${ML_SERVICE_URL}/match`, req.body, {
            headers: mlServiceHeaders(),
            timeout: 30000,
        });
        res.json(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json(error.response.data);
            return;
        }
        console.error('ml-service match request failed:', error);
        res.status(502).json({
            message: 'Failed to reach the matching service.',
        });
    }
});

export default router;
