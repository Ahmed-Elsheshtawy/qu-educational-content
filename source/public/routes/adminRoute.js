import express from 'express';
import {
  addCourse,
  updateCourse,
  deleteCourse,
  incrementResourceCount,
  incrementResourceCountByCode,
  decrementResourceCount,
  decrementResourceCountByCode,
  syncResourceCounts,
  fetchPendingCourses,
  approveCourse,
  rejectCourse
} from '../services/coursesDbService.js';
import {
  addResource,
  updateResource,
  deleteResource,
  fetchResourceById,
  addTagToResource,
  removeTagFromResource,
  fetchPendingResources,
  approveResource,
  rejectResource
} from '../services/resourcesDbService.js';
import authenticateJWT from '../middleware/jwtMiddleware.js';

const adminRouter = express.Router();

// Apply JWT authentication to all admin routes
adminRouter.use(authenticateJWT);

// ==================== COURSE ROUTES ====================

// POST /api/admin/courses - Add a new course
adminRouter.post('/courses', async (req, res) => {
  try {
    const { courseCode, courseName, department, college } = req.body;

    if (!courseCode || !courseName || !department || !college) {
      return res.status(400).json({ 
        error: 'Missing required fields: courseCode, courseName, department, college' 
      });
    }

    const course = await addCourse(req.body);
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course', message: error.message });
  }
});

// PUT /api/admin/courses/:id - Update a course
adminRouter.put('/courses/:id', async (req, res) => {
  try {
    const success = await updateCourse(req.params.id, req.body);
    if (!success) {
      return res.status(404).json({ error: 'Course not found or not modified' });
    }
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course', message: error.message });
  }
});

// DELETE /api/admin/courses/:id - Delete a course
adminRouter.delete('/courses/:id', async (req, res) => {
  try {
    const success = await deleteCourse(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course', message: error.message });
  }
});

// ==================== RESOURCE ROUTES ====================

// POST /api/admin/resources - Add a new resource
adminRouter.post('/resources', async (req, res) => {
  try {
    const { courseCode, title, type, fileUrl, fileName, fileSize, semester } = req.body;

    if (!courseCode || !title || !type || !fileUrl || !fileName || !fileSize || !semester) {
      return res.status(400).json({ 
        error: 'Missing required fields: courseCode, title, type, fileUrl, fileName, fileSize, semester' 
      });
    }

    const resource = await addResource(req.body);
    
    // Increment the resource count for the course
    // Note: You'll need to get the courseId first if using courseId instead of courseCode
    // For now, this assumes you have the courseId in req.body or can fetch it
    if (req.body.courseId) {
      await incrementResourceCount(req.body.courseId);
    }

    res.status(201).json({ message: 'Resource created successfully', resource });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create resource', message: error.message });
  }
});

// PUT /api/admin/resources/:id - Update a resource
adminRouter.put('/resources/:id', async (req, res) => {
  try {
    const success = await updateResource(req.params.id, req.body);
    if (!success) {
      return res.status(404).json({ error: 'Resource not found or not modified' });
    }
    res.json({ message: 'Resource updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update resource', message: error.message });
  }
});

// DELETE /api/admin/resources/:id - Delete a resource
adminRouter.delete('/resources/:id', async (req, res) => {
  try {
    const deleted = await deleteResource(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json({ message: 'Resource deleted successfully', success: true });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource', message: error.message });
  }
});

// POST /api/admin/resources/:id/tags - Add tag to resource
adminRouter.post('/resources/:id/tags', async (req, res) => {
  try {
    const { tag } = req.body;
    if (!tag) {
      return res.status(400).json({ error: 'Tag is required' });
    }

    const success = await addTagToResource(req.params.id, tag);
    if (!success) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json({ message: 'Tag added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add tag', message: error.message });
  }
});

// DELETE /api/admin/resources/:id/tags - Remove tag from resource
adminRouter.delete('/resources/:id/tags', async (req, res) => {
  try {
    const { tag } = req.body;
    if (!tag) {
      return res.status(400).json({ error: 'Tag is required' });
    }

    const success = await removeTagFromResource(req.params.id, tag);
    if (!success) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json({ message: 'Tag removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove tag', message: error.message });
  }
});

// ==================== PENDING SUBMISSIONS ROUTES ====================

// GET /api/admin/courses/pending - Get all pending course requests
adminRouter.get('/courses/pending', async (req, res) => {
  try {
    const pendingCourses = await fetchPendingCourses();
    console.log('📊 Fetching pending courses from DB, found:', pendingCourses.length, 'items');
    console.log('📋 Pending courses data:', pendingCourses);
    res.json(pendingCourses);
  } catch (error) {
    console.error('❌ Error fetching pending courses:', error);
    res.status(500).json({ error: 'Failed to fetch pending courses', message: error.message });
  }
});

// PUT /api/admin/courses/:id/approve - Approve a pending course
adminRouter.put('/courses/:id/approve', async (req, res) => {
  try {
    const course = await approveCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ message: 'Course approved successfully', course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve course', message: error.message });
  }
});

// DELETE /api/admin/courses/:id/reject - Reject a pending course
adminRouter.delete('/courses/:id/reject', async (req, res) => {
  try {
    const success = await rejectCourse(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ message: 'Course rejected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject course', message: error.message });
  }
});

// GET /api/admin/resources/pending - Get all pending submissions
adminRouter.get('/resources/pending', async (req, res) => {
  try {
    const pendingResources = await fetchPendingResources();
    console.log('📊 Fetching pending resources from DB, found:', pendingResources.length, 'items');
    console.log('📋 Pending resources data:', pendingResources);
    res.json(pendingResources);
  } catch (error) {
    console.error('❌ Error fetching pending resources:', error);
    res.status(500).json({ error: 'Failed to fetch pending resources', message: error.message });
  }
});

// POST /api/admin/resources/:id/approve - Approve a pending submission
adminRouter.post('/resources/:id/approve', async (req, res) => {
  try {
    const resource = await approveResource(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Increment resource count for the course using courseCode
    await incrementResourceCountByCode(resource.courseCode);
    
    res.json({ message: 'Resource approved successfully', resource });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve resource', message: error.message });
  }
});

// POST /api/admin/resources/:id/reject - Reject a pending submission
adminRouter.post('/resources/:id/reject', async (req, res) => {
  try {
    const success = await rejectResource(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.json({ message: 'Resource rejected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject resource', message: error.message });
  }
});

// POST /api/admin/courses/sync-counts - Sync resource counts for all courses
adminRouter.post('/courses/sync-counts', async (req, res) => {
  try {
    const results = await syncResourceCounts();
    res.json({ 
      message: 'Resource counts synced successfully', 
      results 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync resource counts', message: error.message });
  }
});

export default adminRouter;
