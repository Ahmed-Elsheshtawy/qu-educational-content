import express from 'express';
import multer from 'multer';
import {
  fetchAllResources,
  fetchResourceById,
  fetchResourcesByCourseCode,
  fetchResourcesByCourseAndType,
  fetchResourcesByType,
  fetchResourcesBySemester,
  fetchResourcesByTag,
  searchResources,
  getMostDownloadedResources,
  getRecentResources,
  getResourceCountByCourse,
  getUniqueResourceTypes,
  getAllTags,
  incrementDownloadCount,
  addResource
} from '../services/resourcesDbService.js';
import { uploadFile, generatePresignedUploadUrl } from '../services/cloudflareService.js';

const resourcesRouter = express.Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 75 * 1024 * 1024, // 75MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'application/x-rar',
      'image/png',
      'image/jpeg',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR, PNG, and JPG files are allowed.'));
    }
  }
});

// POST /api/resources/presigned-url - Generate presigned URL for direct upload
resourcesRouter.post('/presigned-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'application/x-rar',
      'application/octet-stream', // Generic binary, some browsers use this for RAR
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    // For RAR files, also check file extension since MIME type can vary
    const isRarFile = fileName.toLowerCase().endsWith('.rar');
    
    if (!allowedTypes.includes(fileType) && !isRarFile) {
      return res.status(400).json({ 
        error: `Invalid file type (${fileType}). Only PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR, PNG, and JPG files are allowed.` 
      });
    }

    const { uploadUrl, fileKey, publicUrl } = await generatePresignedUploadUrl(fileName, fileType);

    res.json({
      uploadUrl,
      fileKey,
      publicUrl,
      fileName
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL', message: error.message });
  }
});

// POST /api/resources/submit - Public endpoint for student submissions (no auth)
resourcesRouter.post('/submit', async (req, res) => {
  try {
    const { courseCode, title, type, year, fileUrl, fileName, fileSize, description, tags, status } = req.body;

    // Validate required fields
    if (!courseCode || !title || !type || !year || !fileUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields. Please provide courseCode, title, type, year, and fileUrl.' 
      });
    }

    // Parse tags if it's a string
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    const submissionData = {
      courseCode,
      title,
      type,
      description: description || '',
      year: parseInt(year),
      fileUrl,
      fileName: fileName || fileUrl.split('/').pop() || 'resource',
      fileSize: fileSize || null,
      tags: parsedTags,
      downloads: 0,
      status: status || 'pending',
      uploadDate: new Date()
    };

    const resource = await addResource(submissionData);
    
    console.log('✅ Resource submitted with pending status:', { courseCode, title, status: submissionData.status, _id: resource._id });

    res.status(201).json({ 
      message: 'Resource submitted successfully and is pending review',
      resource 
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit resource', message: error.message });
  }
});

// GET /api/resources - Get all resources
resourcesRouter.get('/', async (req, res) => {
  try {
    const resources = await fetchAllResources();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources', message: error.message });
  }
});

// GET /api/resources/search?q=searchTerm - Search resources
// MUST be before /:id to avoid treating "search" as an id
resourcesRouter.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    const resources = await searchResources(searchTerm);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search resources', message: error.message });
  }
});

// GET /api/resources/popular?limit=10 - Get most downloaded resources
resourcesRouter.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const resources = await getMostDownloadedResources(limit);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch popular resources', message: error.message });
  }
});

// GET /api/resources/recent?limit=10 - Get recently uploaded resources
resourcesRouter.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const resources = await getRecentResources(limit);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent resources', message: error.message });
  }
});

// GET /api/resources/course/:courseCode - Get resources by course code
resourcesRouter.get('/course/:courseCode', async (req, res) => {
  try {
    const resources = await fetchResourcesByCourseCode(req.params.courseCode);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources', message: error.message });
  }
});

// GET /api/resources/course/:courseCode/type/:type - Get resources by course and type
resourcesRouter.get('/course/:courseCode/type/:type', async (req, res) => {
  try {
    const resources = await fetchResourcesByCourseAndType(
      req.params.courseCode,
      req.params.type
    );
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources', message: error.message });
  }
});

// GET /api/resources/type/:type - Get resources by type
resourcesRouter.get('/type/:type', async (req, res) => {
  try {
    const resources = await fetchResourcesByType(req.params.type);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources', message: error.message });
  }
});

// GET /api/resources/semester/:semester - Get resources by semester
resourcesRouter.get('/semester/:semester', async (req, res) => {
  try {
    const resources = await fetchResourcesBySemester(req.params.semester);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources', message: error.message });
  }
});

// GET /api/resources/tag/:tag - Get resources by tag
resourcesRouter.get('/tag/:tag', async (req, res) => {
  try {
    const resources = await fetchResourcesByTag(req.params.tag);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources', message: error.message });
  }
});

// GET /api/resources/count/:courseCode - Get resource count by course
resourcesRouter.get('/count/:courseCode', async (req, res) => {
  try {
    const count = await getResourceCountByCourse(req.params.courseCode);
    res.json({ courseCode: req.params.courseCode, count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get resource count', message: error.message });
  }
});

// GET /api/resources/meta/types - Get unique resource types
resourcesRouter.get('/meta/types', async (req, res) => {
  try {
    const types = await getUniqueResourceTypes();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resource types', message: error.message });
  }
});

// GET /api/resources/meta/tags - Get all tags
resourcesRouter.get('/meta/tags', async (req, res) => {
  try {
    const tags = await getAllTags();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags', message: error.message });
  }
});

// GET /api/resources/:id - Get resource by ID
// MUST be LAST among GET routes to avoid conflicts
resourcesRouter.get('/:id', async (req, res) => {
  try {
    const resource = await fetchResourceById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resource', message: error.message });
  }
});

// POST /api/resources/:id/download - Increment download count
resourcesRouter.post('/:id/download', async (req, res) => {
  try {
    const success = await incrementDownloadCount(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json({ message: 'Download count incremented' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to increment download count', message: error.message });
  }
});

export default resourcesRouter;
