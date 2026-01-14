import express from 'express';
import {
  fetchAllCourses,
  fetchCourseById,
  fetchCourseByCourseCode,
  fetchCoursesByDepartment,
  fetchCoursesBySemester,
  searchCourses,
  getUniqueDepartments,
  getUniqueSemesters,
  syncResourceCounts,
  addCourse
} from '../services/coursesDbService.js';

const coursesRouter = express.Router();

// POST /api/courses/request - Submit a new course request (adds directly)
// MUST be before /:id route to avoid conflict
coursesRouter.post('/request', async (req, res) => {
  try {
    const { courseCode, courseName, department, college } = req.body;

    // Validate required fields
    if (!courseCode || !courseName || !department || !college) {
      return res.status(400).json({ 
        error: 'Missing required fields: courseCode, courseName, department, college' 
      });
    }

    // Check if course already exists
    const existingCourse = await fetchCourseByCourseCode(courseCode);
    if (existingCourse) {
      return res.status(409).json({ 
        error: 'Course already exists',
        message: `A course with code ${courseCode} is already in the database.`
      });
    }

    // Add the course directly to the database
    const course = await addCourse({
      courseCode,
      courseName,
      college,
      department,
      resourceCount: 0
    });

    res.status(201).json({ 
      message: 'Course added successfully!', 
      course 
    });
  } catch (error) {
    console.error('Error adding course:', error);
    res.status(500).json({ 
      error: 'Failed to add course', 
      message: error.message 
    });
  }
});

// POST /api/courses/sync-counts - Sync resource counts (public endpoint)
coursesRouter.post('/sync-counts', async (req, res) => {
  try {
    await syncResourceCounts();
    res.json({ message: 'Resource counts synced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync resource counts', message: error.message });
  }
});

// GET /api/courses - Get all courses
coursesRouter.get('/', async (req, res) => {
  try {
    const courses = await fetchAllCourses();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses', message: error.message });
  }
});

// GET /api/courses/search?q=searchTerm - Search courses
// MUST be before /:id to avoid treating "search" as an id
coursesRouter.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    const courses = await searchCourses(searchTerm);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search courses', message: error.message });
  }
});

// GET /api/courses/code/:courseCode - Get course by course code
coursesRouter.get('/code/:courseCode', async (req, res) => {
  try {
    const course = await fetchCourseByCourseCode(req.params.courseCode);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course', message: error.message });
  }
});

// GET /api/courses/department/:department - Get courses by department
coursesRouter.get('/department/:department', async (req, res) => {
  try {
    const courses = await fetchCoursesByDepartment(req.params.department);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses', message: error.message });
  }
});

// GET /api/courses/semester/:semester - Get courses by semester
coursesRouter.get('/semester/:semester', async (req, res) => {
  try {
    const courses = await fetchCoursesBySemester(req.params.semester);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses', message: error.message });
  }
});

// GET /api/courses/meta/departments - Get unique departments
coursesRouter.get('/meta/departments', async (req, res) => {
  try {
    const departments = await getUniqueDepartments();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments', message: error.message });
  }
});

// GET /api/courses/meta/semesters - Get unique semesters
coursesRouter.get('/meta/semesters', async (req, res) => {
  try {
    const semesters = await getUniqueSemesters();
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch semesters', message: error.message });
  }
});

// GET /api/courses/:id - Get course by ID
// MUST be LAST among GET routes to avoid conflicts
coursesRouter.get('/:id', async (req, res) => {
  try {
    const course = await fetchCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course', message: error.message });
  }
});

export default coursesRouter;
