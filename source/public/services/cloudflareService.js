import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Initialize Cloudflare R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL; // Your R2 bucket's public URL

/**
 * Upload a file to Cloudflare R2
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{fileUrl: string, fileName: string, fileSize: number}>}
 */
export async function uploadFile(fileBuffer, originalName, mimeType) {
  try {
    // Generate unique filename
    const fileExtension = originalName.split('.').pop();
    const uniqueFileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${fileExtension}`;
    
    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await r2Client.send(command);

    // Construct public URL
    const fileUrl = `${PUBLIC_URL}/${uniqueFileName}`;
    
    return {
      fileUrl,
      fileName: originalName,
      fileSize: fileBuffer.length,
    };
  } catch (error) {
    console.error('Error uploading file to R2:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Delete a file from Cloudflare R2
 * @param {string} fileUrl - The public URL of the file
 * @returns {Promise<boolean>}
 */
export async function deleteFile(fileUrl) {
  try {
    // Extract filename from URL
    const fileName = fileUrl.split('/').pop();
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    return false;
  }
}

/**
 * Generate a presigned URL for direct upload to R2
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{uploadUrl: string, fileKey: string, publicUrl: string}>}
 */
export async function generatePresignedUploadUrl(originalName, mimeType) {
  try {
    // Generate unique filename
    const fileExtension = originalName.split('.').pop();
    const uniqueFileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${fileExtension}`;
    
    // Create upload command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: mimeType,
    });

    // Generate presigned URL (valid for 10 minutes)
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });
    
    // Construct public URL
    const publicUrl = `${PUBLIC_URL}/${uniqueFileName}`;
    
    return {
      uploadUrl,
      fileKey: uniqueFileName,
      publicUrl,
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate upload URL');
  }
}
