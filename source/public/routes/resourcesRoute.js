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

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Allowed MIME types for file uploads
 * Supports: PDF, Word, PowerPoint, ZIP, RAR, PNG, JPEG
 */
const ALLOWED_FILE_TYPES = [
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
  'application/octet-stream',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB
const FILE_TYPE_ERROR_MESSAGE = 'Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR, PNG, and JPG files are allowed.';

/**
 * Multer configuration for handling file uploads in memory
 * Files are temporarily stored in memory before being uploaded to Cloudflare R2
 */
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(FILE_TYPE_ERROR_MESSAGE));
    }
  }
});

// ============================================================================
// UPLOAD & SUBMISSION ROUTES (Public - No authentication required)
// ============================================================================

/**
 * POST /api/resources/presigned-url
 * Generate a presigned URL for direct file upload to Cloudflare R2
 * This allows clients to upload files directly to cloud storage
 * 
 * Request body: { fileName: string, fileType: string }
 * Response: { uploadUrl, fileKey, publicUrl, fileName }
 */
resourcesRouter.post('/presigned-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    // Validate required fields
    if (!fileName || !fileType) {
      return res.status(400).json({ 
        error: 'fileName and fileType are required' 
      });
    }

    // Validate file type - also check extension for RAR files (MIME type varies)
    const isRarFile = fileName.toLowerCase().endsWith('.rar');
    if (!ALLOWED_FILE_TYPES.includes(fileType) && !isRarFile) {
      return res.status(400).json({ 
        error: `Invalid file type (${fileType}). ${FILE_TYPE_ERROR_MESSAGE}` 
      });
    }

    // Generate presigned URL from Cloudflare service
    const { uploadUrl, fileKey, publicUrl } = await generatePresignedUploadUrl(fileName, fileType);

    res.json({ uploadUrl, fileKey, publicUrl, fileName });
    
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate upload URL', 
      message: error.message 
    });
  }
});

/**
 * POST /api/resources/submit
 * Submit a new resource for review (public endpoint - no authentication)
 * Students can submit resources which will be marked as "pending" until admin approval
 * 
 * Request body: {
 *   courseCode: string (required)
 *   title: string (required)
 *   type: string (required)
 *   year: number (required)
 *   fileUrl: string (required)
 *   fileName?: string
 *   fileSize?: number
 *   description?: string
 *   tags?: string[] | string (JSON)
 *   status?: string
 * }
 */
resourcesRouter.post('/submit', async (req, res) => {
  try {
    const { 
      courseCode, 
      title, 
      type, 
      year, 
      fileUrl, 
      fileName, 
      fileSize, 
      description, 
      tags, 
      status 
    } = req.body;

    // Validate required fields
    if (!courseCode || !title || !type || !year || !fileUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields. Please provide courseCode, title, type, year, and fileUrl.' 
      });
    }

    // Parse tags - handle both string (JSON) and array formats
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    // Prepare submission data with defaults
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
      status: status || 'pending', // Default to pending for manual review
      uploadDate: new Date()
    };

    const resource = await addResource(submissionData);
    
    console.log('✅ Resource submitted with pending status:', { 
      courseCode, 
      title, 
      status: submissionData.status, 
      _id: resource._id 
    });

    res.status(201).json({ 
      message: 'Resource submitted successfully and is pending review',
      resource 
    });
    
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ 
      error: 'Failed to submit resource', 
      message: error.message 
    });
  }
});

// ============================================================================
// SEARCH & DISCOVERY ROUTES
// ============================================================================

/**
 * GET /api/resources/search?q=searchTerm
 * Search resources by keywords in title, description, or tags
 * Must be defined before /:id route to avoid "search" being treated as an ID
 * 
 * Query params: q (search term - required)
 */
resourcesRouter.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.status(400).json({ 
        error: 'Search term is required' 
      });
    }
    
    const resources = await searchResources(searchTerm);
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to search resources', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/popular?limit=10
 * Get most downloaded resources ordered by download count
 * 
 * Query params: limit (number, default: 10)
 */
resourcesRouter.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const resources = await getMostDownloadedResources(limit);
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch popular resources', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/recent?limit=10
 * Get recently uploaded resources ordered by upload date
 * 
 * Query params: limit (number, default: 10)
 */
resourcesRouter.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const resources = await getRecentResources(limit);
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch recent resources', 
      message: error.message 
    });
  }
});

// ============================================================================
// FILTERING ROUTES - Get resources by various criteria
// ============================================================================

/**
 * GET /api/resources/course/:courseCode
 * Get all resources for a specific course
 * 
 * URL params: courseCode (e.g., CMPS205)
 */
resourcesRouter.get('/course/:courseCode', async (req, res) => {
  try {
    const resources = await fetchResourcesByCourseCode(req.params.courseCode);
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch resources', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/course/:courseCode/type/:type
 * Get resources filtered by both course code AND resource type
 * 
 * URL params: 
 *   - courseCode (e.g., CMPS205)
 *   - type (e.g., lectures, assignments, exams)
 */
resourcesRouter.get('/course/:courseCode/type/:type', async (req, res) => {
  try {
    const resources = await fetchResourcesByCourseAndType(
      req.params.courseCode,
      req.params.type
    );
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch resources', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/type/:type
 * Get all resources of a specific type across all courses
 * 
 * URL params: type (e.g., lectures, assignments, exams, notes)
 */
resourcesRouter.get('/type/:type', async (req, res) => {
  try {
    const resources = await fetchResourcesByType(req.params.type);
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch resources', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/semester/:semester
 * Get all resources from a specific semester
 * 
 * URL params: semester (e.g., Fall2024, Spring2025)
 */
resourcesRouter.get('/semester/:semester', async (req, res) => {
  try {
    const resources = await fetchResourcesBySemester(req.params.semester);
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch resources', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/tag/:tag
 * Get all resources with a specific tag
 * 
 * URL params: tag (e.g., midterm, final, quiz)
 */
resourcesRouter.get('/tag/:tag', async (req, res) => {
  try {
    const resources = await fetchResourcesByTag(req.params.tag);
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch resources', 
      message: error.message 
    });
  }
});

// ============================================================================
// METADATA & STATISTICS ROUTES
// ============================================================================

/**
 * GET /api/resources/count/:courseCode
 * Get the total number of resources for a specific course
 * 
 * URL params: courseCode (e.g., CMPS205)
 * Response: { courseCode, count }
 */
resourcesRouter.get('/count/:courseCode', async (req, res) => {
  try {
    const count = await getResourceCountByCourse(req.params.courseCode);
    res.json({ 
      courseCode: req.params.courseCode, 
      count 
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get resource count', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/meta/types
 * Get a list of all unique resource types in the system
 * Used for populating filter dropdowns
 * 
 * Response: Array of unique type strings
 */
resourcesRouter.get('/meta/types', async (req, res) => {
  try {
    const types = await getUniqueResourceTypes();
    res.json(types);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch resource types', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/meta/tags
 * Get a list of all tags used across all resources
 * Used for tag-based filtering and suggestions
 * 
 * Response: Array of unique tag strings
 */
resourcesRouter.get('/meta/tags', async (req, res) => {
  try {
    const tags = await getAllTags();
    res.json(tags);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch tags', 
      message: error.message 
    });
  }
});

// ============================================================================
// GENERAL RESOURCE RETRIEVAL ROUTES
// ============================================================================

/**
 * GET /api/resources
 * Get all resources in the system
 * Note: This returns ALL resources. Consider using filtered endpoints for better performance.
 */
resourcesRouter.get('/', async (req, res) => {
  try {
    const resources = await fetchAllResources();
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch resources', 
      message: error.message 
    });
  }
});

/**
 * GET /api/resources/:id
 * Get a single resource by its unique ID
 * 
 * IMPORTANT: Must be defined LAST among GET routes to prevent conflicts
 * (Otherwise "search", "popular", etc. would be interpreted as IDs)
 * 
 * URL params: id (MongoDB ObjectId)
 */
resourcesRouter.get('/:id', async (req, res) => {
  try {
    const resource = await fetchResourceById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ 
        error: 'Resource not found' 
      });
    }
    
    res.json(resource);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch resource', 
      message: error.message 
    });
  }
});

// ============================================================================
// RESOURCE ACTIONS
// ============================================================================

/**
 * POST /api/resources/:id/download
 * Increment the download counter for a resource
 * Call this endpoint when a user downloads a resource
 * 
 * URL params: id (MongoDB ObjectId)
 */
resourcesRouter.post('/:id/download', async (req, res) => {
  try {
    const success = await incrementDownloadCount(req.params.id);
    
    if (!success) {
      return res.status(404).json({ 
        error: 'Resource not found' 
      });
    }
    
    res.json({ 
      message: 'Download count incremented' 
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to increment download count', 
      message: error.message 
    });
  }
});

// ============================================================================
// EXPORT
// ============================================================================

export default resourcesRouter;
