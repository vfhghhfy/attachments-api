import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple headers - only User-Agent as requested
const createHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
});

// Helper: HTTP request with error handling
const makeRequest = async (url, options = {}) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: createHeaders(),
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeout);

    return {
      success: true,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: await response.text()
    };
  } catch (error) {
    return {
      success: false,
      error: error.name === 'AbortError' ? 'Request timeout' : error.message
    };
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'EZGIF API',
    status: 'active',
    endpoints: [
      'GET /api/status',
      'POST /api/convert'
    ]
  });
});

app.get('/api/status', async (req, res) => {
  try {
    const result = await makeRequest('https://ezgif.com');
    
    if (!result.success) {
      return res.json({
        service: 'EZGIF API',
        website: 'https://ezgif.com',
        reachable: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      service: 'EZGIF API',
      website: 'https://ezgif.com',
      reachable: true,
      statusCode: result.status,
      timestamp: new Date().toISOString(),
      responseSize: result.data.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/api/convert', async (req, res) => {
  try {
    const { action, url, file, options = {} } = req.body;

    if (!action) {
      return res.status(400).json({
        error: 'Missing action parameter',
        example: {
          action: 'gif-to-mp4',
          url: 'https://example.com/image.gif',
          options: { quality: 80 }
        }
      });
    }

    // Validate action
    const validActions = [
      'gif-to-mp4', 'video-to-gif', 'resize', 'optimize',
      'crop', 'reverse', 'speed', 'rotate'
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        validActions: validActions
      });
    }

    // Check if we have file data or URL
    if (!url && !file) {
      return res.status(400).json({
        error: 'Either url or file parameter is required'
      });
    }

    // For demo purposes - return mock response
    // In production, you would make actual request to ezgif.com
    
    const mockResponses = {
      'gif-to-mp4': {
        success: true,
        action: 'gif-to-mp4',
        input: url || 'file_uploaded',
        output: `https://ezgif.com/output/${Date.now()}.mp4`,
        duration: '5.2s',
        size: '2.4 MB',
        status: 'completed'
      },
      'video-to-gif': {
        success: true,
        action: 'video-to-gif',
        input: url || 'file_uploaded',
        output: `https://ezgif.com/output/${Date.now()}.gif`,
        duration: '3.8s',
        size: '1.8 MB',
        status: 'completed'
      },
      'resize': {
        success: true,
        action: 'resize',
        input: url || 'file_uploaded',
        output: `https://ezgif.com/output/${Date.now()}.png`,
        originalSize: '1920x1080',
        newSize: options.size || '800x600',
        status: 'completed'
      },
      'optimize': {
        success: true,
        action: 'optimize',
        input: url || 'file_uploaded',
        output: `https://ezgif.com/output/${Date.now()}.gif`,
        originalSize: '4.2 MB',
        optimizedSize: '1.1 MB',
        reduction: '73%',
        status: 'completed'
      }
    };

    const response = mockResponses[action] || {
      success: true,
      action: action,
      message: 'Conversion request received',
      timestamp: new Date().toISOString(),
      status: 'processing'
    };

    res.json(response);

  } catch (error) {
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
