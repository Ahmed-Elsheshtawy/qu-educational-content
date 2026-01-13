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
  syncResourceCounts
} from '../services/coursesDbService.js';

const coursesRouter = express.Router();

// GET /api/courses - Get all courses
coursesRouter.get('/', async (req, res) => {
  try {
    const courses = await fetchAllCourses();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses', message: error.message });
  }
});

// GET /api/courses/:id - Get course by ID
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

// GET /api/courses/search?q=searchTerm - Search courses
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

// POST /api/courses/sync-counts - Sync resource counts (public endpoint)
coursesRouter.post('/sync-counts', async (req, res) => {
  try {
    await syncResourceCounts();
    res.json({ message: 'Resource counts synced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync resource counts', message: error.message });
  }
});

export default coursesRouter;
