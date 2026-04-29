import { getCoursesCollection } from './mongoService.js';
import { ObjectId } from 'mongodb';

// Fetch all courses (only approved)
export async function fetchAllCourses() {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.find({ 
    $or: [{ status: 'approved' }, { status: { $exists: false } }] 
  }).toArray();
}

// Fetch a single course by ID
export async function fetchCourseById(courseId) {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.findOne({ _id: new ObjectId(courseId) });
}

// Fetch a course by course code
export async function fetchCourseByCourseCode(courseCode) {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.findOne({ courseCode: courseCode });
}

// Fetch courses by department
export async function fetchCoursesByDepartment(department) {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.find({ department: department }).toArray();
}

// Fetch courses by semester
export async function fetchCoursesBySemester(semester) {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.find({ semester: semester }).toArray();
}

// Add a new course
export async function addCourse(courseData) {
  const coursesCollection = await getCoursesCollection();
  const course = {
    courseCode: courseData.courseCode,
    courseName: courseData.courseName,
    college: courseData.college,
    department: courseData.department,
    semester: courseData.semester || null,
    professor: courseData.professor || null,
    description: courseData.description || null,
    resourceCount: 0,
    status: courseData.status || 'pending'
  };
  const result = await coursesCollection.insertOne(course);
  return { ...course, _id: result.insertedId };
}

// Update a course
export async function updateCourse(courseId, updateData) {
  const coursesCollection = await getCoursesCollection();
  const result = await coursesCollection.updateOne(
    { _id: new ObjectId(courseId) },
    { $set: updateData }
  );
  return result.modifiedCount > 0;
}

// Delete a course
export async function deleteCourse(courseId) {
  const coursesCollection = await getCoursesCollection();
  const result = await coursesCollection.deleteOne({ _id: new ObjectId(courseId) });
  return result.deletedCount > 0;
}

// Increment resource count
export async function incrementResourceCount(courseId) {
  const coursesCollection = await getCoursesCollection();
  const result = await coursesCollection.updateOne(
    { _id: new ObjectId(courseId) },
    { $inc: { resourceCount: 1 } }
  );
  return result.modifiedCount > 0;
}

// Increment resource count by course code
export async function incrementResourceCountByCode(courseCode) {
  const coursesCollection = await getCoursesCollection();
  const result = await coursesCollection.updateOne(
    { courseCode: courseCode },
    { $inc: { resourceCount: 1 } }
  );
  return result.modifiedCount > 0;
}

// Decrement resource count by course code
export async function decrementResourceCountByCode(courseCode) {
  const coursesCollection = await getCoursesCollection();
  const result = await coursesCollection.updateOne(
    { courseCode: courseCode },
    { $inc: { resourceCount: -1 } }
  );
  return result.modifiedCount > 0;
}

// Sync resource counts for all courses
export async function syncResourceCounts() {
  const coursesCollection = await getCoursesCollection();
  const { getResourcesCollection } = await import('./mongoService.js');
  const resourcesCollection = await getResourcesCollection();

  try {
    // Get all courses
    const courses = await coursesCollection.find({}).toArray();
    
    const updatePromises = courses.map(async (course) => {
      // Count actual approved resources for this course
      const actualCount = await resourcesCollection.countDocuments({
        courseCode: course.courseCode,
        $or: [{ status: 'approved' }, { status: { $exists: false } }]
      });
      
      // Update the course's resource count
      await coursesCollection.updateOne(
        { _id: course._id },
        { $set: { resourceCount: actualCount } }
      );
      
      return {
        courseCode: course.courseCode,
        oldCount: course.resourceCount || 0,
        newCount: actualCount
      };
    });
    
    const results = await Promise.all(updatePromises);
    return results;
  } catch (error) {
    console.error('Error syncing resource counts:', error);
    throw error;
  }
}

// Decrement resource count
export async function decrementResourceCount(courseId) {
  const coursesCollection = await getCoursesCollection();
  const result = await coursesCollection.updateOne(
    { _id: new ObjectId(courseId) },
    { $inc: { resourceCount: -1 } }
  );
  return result.modifiedCount > 0;
}

// Search courses by name or code
export async function searchCourses(searchTerm) {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.find({
    $or: [
      { courseName: { $regex: searchTerm, $options: 'i' } },
      { courseCode: { $regex: searchTerm, $options: 'i' } }
    ]
  }).toArray();
}

// Get unique departments
export async function getUniqueDepartments() {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.distinct('department');
}

// Get unique semesters
export async function getUniqueSemesters() {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.distinct('semester');
}

// Fetch pending courses (for admin)
export async function fetchPendingCourses() {
  const coursesCollection = await getCoursesCollection();
  return await coursesCollection.find({ status: 'pending' }).toArray();
}

// Approve course (change status to approved)
export async function approveCourse(courseId) {
  const coursesCollection = await getCoursesCollection();
  const result = await coursesCollection.findOneAndUpdate(
    { _id: new ObjectId(courseId) },
    { $set: { status: 'approved' } },
    { returnDocument: 'after' }
  );
  return result.value || result;
}

// Reject course (delete it permanently)
export async function rejectCourse(courseId) {
  const coursesCollection = await getCoursesCollection();
  const result = await coursesCollection.deleteOne({ _id: new ObjectId(courseId) });
  return result.deletedCount > 0;
}

