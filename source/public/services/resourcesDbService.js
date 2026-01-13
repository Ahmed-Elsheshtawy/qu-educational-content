import { getResourcesCollection } from './mongoService.js';
import { ObjectId } from 'mongodb';

// Fetch all resources (only approved for public)
export async function fetchAllResources() {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({ 
    $or: [{ status: 'approved' }, { status: { $exists: false } }]
  }).toArray();
}

// Fetch a single resource by ID
export async function fetchResourceById(resourceId) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.findOne({ _id: new ObjectId(resourceId) });
}

// Fetch resources by course code (only approved for public)
export async function fetchResourcesByCourseCode(courseCode) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({ 
    courseCode: courseCode,
    $or: [{ status: 'approved' }, { status: { $exists: false } }]
  }).toArray();
}

// Fetch resources by course code and type
export async function fetchResourcesByCourseAndType(courseCode, type) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({ 
    courseCode: courseCode,
    type: type 
  }).toArray();
}

// Fetch resources by type (exam, lecture-notes, exercises, slides, etc.)
export async function fetchResourcesByType(type) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({ type: type }).toArray();
}

// Fetch resources by semester
export async function fetchResourcesBySemester(semester) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({ semester: semester }).toArray();
}

// Fetch resources by tags
export async function fetchResourcesByTag(tag) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({ tags: tag }).toArray();
}

// Add a new resource
export async function addResource(resourceData) {
  const resourcesCollection = await getResourcesCollection();
  const resource = {
    courseCode: resourceData.courseCode,
    title: resourceData.title,
    type: resourceData.type,
    description: resourceData.description || null,
    year: resourceData.year,
    fileUrl: resourceData.fileUrl,
    fileName: resourceData.fileName,
    fileSize: resourceData.fileSize,
    uploadDate: new Date(),
    semester: resourceData.semester,
    downloads: 0,
    tags: resourceData.tags || [],
    status: resourceData.status || 'pending'
  };
  const result = await resourcesCollection.insertOne(resource);
  return { ...resource, _id: result.insertedId };
}

// Update a resource
export async function updateResource(resourceId, updateData) {
  const resourcesCollection = await getResourcesCollection();
  const result = await resourcesCollection.updateOne(
    { _id: new ObjectId(resourceId) },
    { $set: updateData }
  );
  return result.modifiedCount > 0;
}

// Delete a resource
export async function deleteResource(resourceId) {
  const resourcesCollection = await getResourcesCollection();
  const result = await resourcesCollection.deleteOne({ _id: new ObjectId(resourceId) });
  return result.deletedCount > 0;
}

// Increment download count
export async function incrementDownloadCount(resourceId) {
  const resourcesCollection = await getResourcesCollection();
  const result = await resourcesCollection.updateOne(
    { _id: new ObjectId(resourceId) },
    { $inc: { downloads: 1 } }
  );
  return result.modifiedCount > 0;
}

// Search resources by title or description
export async function searchResources(searchTerm) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  }).toArray();
}

// Get most downloaded resources
export async function getMostDownloadedResources(limit = 10) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({})
    .sort({ downloads: -1 })
    .limit(limit)
    .toArray();
}

// Get recently uploaded resources
export async function getRecentResources(limit = 10) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({})
    .sort({ uploadDate: -1 })
    .limit(limit)
    .toArray();
}

// Get resource count by course code
export async function getResourceCountByCourse(courseCode) {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.countDocuments({ courseCode: courseCode });
}

// Get unique resource types
export async function getUniqueResourceTypes() {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.distinct('type');
}

// Get all tags
export async function getAllTags() {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.distinct('tags');
}

// Add tag to resource
export async function addTagToResource(resourceId, tag) {
  const resourcesCollection = await getResourcesCollection();
  const result = await resourcesCollection.updateOne(
    { _id: new ObjectId(resourceId) },
    { $addToSet: { tags: tag } }
  );
  return result.modifiedCount > 0;
}

// Remove tag from resource
export async function removeTagFromResource(resourceId, tag) {
  const resourcesCollection = await getResourcesCollection();
  const result = await resourcesCollection.updateOne(
    { _id: new ObjectId(resourceId) },
    { $pull: { tags: tag } }
  );
  return result.modifiedCount > 0;
}

// Fetch pending resources (for admin)
export async function fetchPendingResources() {
  const resourcesCollection = await getResourcesCollection();
  return await resourcesCollection.find({ status: 'pending' }).toArray();
}

// Approve resource (change status to approved)
export async function approveResource(resourceId) {
  const resourcesCollection = await getResourcesCollection();
  const result = await resourcesCollection.findOneAndUpdate(
    { _id: new ObjectId(resourceId) },
    { $set: { status: 'approved' } },
    { returnDocument: 'after' }
  );
  return result.value || result;
}

// Reject resource (delete it)
export async function rejectResource(resourceId) {
  const resourcesCollection = await getResourcesCollection();
  const result = await resourcesCollection.deleteOne({ _id: new ObjectId(resourceId) });
  return result.deletedCount > 0;
}
