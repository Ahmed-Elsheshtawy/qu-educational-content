# Direct-to-R2 Upload Implementation

## Overview
Implemented presigned URL upload system to bypass Vercel's 4.5MB body size limit. Files now upload directly to Cloudflare R2 from the browser, supporting unlimited file sizes.

## How It Works

### 1. User Flow
1. User selects a file on the submit form
2. Frontend requests a presigned URL from `/api/resources/presigned-url`
3. Server generates a temporary signed URL for R2 (valid for 10 minutes)
4. Frontend uploads file directly to R2 using the presigned URL
5. After upload completes, frontend submits resource metadata to `/api/resources/submit`

### 2. Key Changes

#### Backend
- **cloudflareService.js**: Added `generatePresignedUploadUrl()` function
- **resourcesRoute.js**: 
  - New endpoint: `POST /api/resources/presigned-url`
  - Modified `POST /api/resources/submit` to accept JSON instead of FormData
  - Removed multer middleware from submit endpoint

#### Frontend
- **submitScript.js**: 
  - New function: `uploadFileDirectly()` - handles presigned URL flow
  - Modified `handleSubmit()` to use direct upload for files
  - Shows progress: "Preparing upload..." → "Uploading X MB..." → "Submitting..."
- **submit.html**: Updated file size limit text from 4.5MB to 50MB

#### Dependencies
- Added `@aws-sdk/s3-request-presigner` package

## Benefits

✅ **No file size limit** - Upload files of any size
✅ **Faster uploads** - Direct to R2, no Vercel proxy
✅ **No extra cost** - Uses existing R2 bucket
✅ **More secure** - Presigned URLs expire in 10 minutes
✅ **Better UX** - Shows detailed upload progress

## File Size Limits

- **Old system**: 4.5MB (Vercel limit)
- **New system**: 50MB (configurable, can be increased)
- **R2 limit**: 5TB per object (effectively unlimited for this use case)

## Security

- Presigned URLs expire after 10 minutes
- URLs are single-use (for upload only)
- File type validation still enforced
- All files stored in private R2 bucket with public access

## Testing

1. Try uploading files larger than 4.5MB (e.g., 10MB, 20MB)
2. Verify upload progress messages appear correctly
3. Confirm file appears in R2 bucket
4. Verify resource metadata saved to MongoDB
5. Test download link works from course detail page

## Deployment

After deploying to Vercel:
1. Ensure `CLOUDFLARE_R2_ENDPOINT` is set in environment variables
2. Ensure `CLOUDFLARE_R2_ACCESS_KEY_ID` is set
3. Ensure `CLOUDFLARE_R2_SECRET_ACCESS_KEY` is set
4. Ensure `CLOUDFLARE_R2_BUCKET_NAME` is set
5. Ensure `CLOUDFLARE_R2_PUBLIC_URL` is set

## Rollback

If issues occur, the old FormData/multer system is still available:
- Revert `resourcesRoute.js` submit endpoint to use `upload.single('file')` middleware
- Revert `submitScript.js` handleSubmit to use FormData
- Files under 4.5MB will work with old system
