/**
 * ==========================================
 * AWS S3 CONFIGURATION & UTILITIES
 * ==========================================
 * Setup and management of AWS S3 operations
 */

import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initialize S3 client
 */
const s3Client = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Verify S3 credentials are configured
 */
export const verifieS3Config = async () => {
  try {
    const bucketName = process.env.AWS_S3_BUCKET;
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
      throw new Error('Missing required AWS S3 configuration variables');
    }

    // Test connection by listing bucket
    const response = await s3Client.listObjectsV2({
      Bucket: bucketName,
      MaxKeys: 1
    }).promise();

    console.log('✅ AWS S3 credentials verified successfully');
    return true;
  } catch (error) {
    console.error('❌ AWS S3 Configuration Error:', error.message);
    return false;
  }
};

/**
 * Get S3 bucket configuration
 */
export const getBucketConfig = async () => {
  try {
    const bucketName = process.env.AWS_S3_BUCKET;

    const [versioning, acl, cors, lifecycle] = await Promise.all([
      s3Client.getBucketVersioning({ Bucket: bucketName }).promise(),
      s3Client.getBucketAcl({ Bucket: bucketName }).promise(),
      s3Client.getBucketCors({ Bucket: bucketName }).promise().catch(() => ({})),
      s3Client.getBucketLifecycle({ Bucket: bucketName }).promise().catch(() => ({}))
    ]);

    return {
      versioning,
      acl,
      cors,
      lifecycle
    };
  } catch (error) {
    console.error('Error fetching bucket config:', error.message);
    return null;
  }
};

/**
 * Set up CORS for bucket (required for frontend uploads)
 */
export const setupBucketCORS = async () => {
  try {
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
          AllowedOrigins: [
            process.env.CLIENT_URL || 'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5173'
          ],
          ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
          MaxAgeSeconds: 3000
        }
      ]
    };

    await s3Client.putBucketCors({
      Bucket: process.env.AWS_S3_BUCKET,
      CORSConfiguration: corsConfiguration
    }).promise();

    console.log('✅ S3 CORS configuration set up successfully');
    return true;
  } catch (error) {
    console.error('Error setting up CORS:', error.message);
    return false;
  }
};

/**
 * Create multipart upload for large files
 */
export const initiateMultipartUpload = async (bucket, key) => {
  try {
    const response = await s3Client.createMultipartUpload({
      Bucket: bucket,
      Key: key,
      ServerSideEncryption: 'AES256'
    }).promise();

    return response.UploadId;
  } catch (error) {
    console.error('Error initiating multipart upload:', error.message);
    throw error;
  }
};

/**
 * Upload file part for multipart upload
 */
export const uploadPart = async (bucket, key, uploadId, partNumber, body) => {
  try {
    const response = await s3Client.uploadPart({
      Bucket: bucket,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: body
    }).promise();

    return {
      partNumber,
      etag: response.ETag
    };
  } catch (error) {
    console.error('Error uploading part:', error.message);
    throw error;
  }
};

/**
 * Complete multipart upload
 */
export const completeMultipartUpload = async (bucket, key, uploadId, parts) => {
  try {
    const response = await s3Client.completeMultipartUpload({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
      }
    }).promise();

    return response.Location;
  } catch (error) {
    console.error('Error completing multipart upload:', error.message);
    throw error;
  }
};

/**
 * Get object metadata without downloading
 */
export const getObjectMetadata = async (bucket, key) => {
  try {
    const response = await s3Client.headObject({
      Bucket: bucket,
      Key: key
    }).promise();

    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      etag: response.ETag,
      metadata: response.Metadata
    };
  } catch (error) {
    console.error('Error fetching object metadata:', error.message);
    throw error;
  }
};

/**
 * Copy object between buckets or paths
 */
export const copyObject = async (sourceBucket, sourceKey, destBucket, destKey) => {
  try {
    await s3Client.copyObject({
      Bucket: destBucket,
      CopySource: `/${sourceBucket}/${sourceKey}`,
      Key: destKey
    }).promise();

    console.log(`✅ Object copied from ${sourceKey} to ${destKey}`);
    return true;
  } catch (error) {
    console.error('Error copying object:', error.message);
    throw error;
  }
};

/**
 * Move object (copy and delete)
 */
export const moveObject = async (sourceBucket, sourceKey, destBucket, destKey) => {
  try {
    await copyObject(sourceBucket, sourceKey, destBucket, destKey);
    await s3Client.deleteObject({
      Bucket: sourceBucket,
      Key: sourceKey
    }).promise();

    console.log(`✅ Object moved from ${sourceKey} to ${destKey}`);
    return true;
  } catch (error) {
    console.error('Error moving object:', error.message);
    throw error;
  }
};

/**
 * Generate presigned URL for upload
 */
export const generatePresignedUploadUrl = async (bucket, key, expiresIn = 3600) => {
  try {
    const url = s3Client.getSignedUrl('putObject', {
      Bucket: bucket,
      Key: key,
      Expires: expiresIn,
      ServerSideEncryption: 'AES256'
    });

    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error.message);
    throw error;
  }
};

/**
 * List all objects in bucket with prefix
 */
export const listObjects = async (bucket, prefix = '', maxKeys = 100) => {
  try {
    const response = await s3Client.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys
    }).promise();

    return response.Contents || [];
  } catch (error) {
    console.error('Error listing objects:', error.message);
    throw error;
  }
};

/**
 * Delete multiple objects
 */
export const deleteObjects = async (bucket, keys) => {
  try {
    const response = await s3Client.deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key }))
      }
    }).promise();

    return response;
  } catch (error) {
    console.error('Error deleting objects:', error.message);
    throw error;
  }
};

/**
 * Get object ACL
 */
export const getObjectACL = async (bucket, key) => {
  try {
    const response = await s3Client.getObjectAcl({
      Bucket: bucket,
      Key: key
    }).promise();

    return response.Grants;
  } catch (error) {
    console.error('Error getting object ACL:', error.message);
    throw error;
  }
};

/**
 * Set object ACL
 */
export const setObjectACL = async (bucket, key, acl = 'private') => {
  try {
    await s3Client.putObjectAcl({
      Bucket: bucket,
      Key: key,
      ACL: acl // 'private', 'public-read', 'public-read-write'
    }).promise();

    console.log(`✅ Object ACL set to ${acl}`);
    return true;
  } catch (error) {
    console.error('Error setting object ACL:', error.message);
    throw error;
  }
};

/**
 * Get bucket size (total size of all objects)
 */
export const getBucketSize = async (bucket) => {
  try {
    const response = await s3Client.listObjectsV2({
      Bucket: bucket
    }).promise();

    let totalSize = 0;
    (response.Contents || []).forEach(obj => {
      totalSize += obj.Size;
    });

    return {
      totalSize,
      totalSizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
      objectCount: response.KeyCount
    };
  } catch (error) {
    console.error('Error calculating bucket size:', error.message);
    throw error;
  }
};

export default {
  s3Client,
  verifieS3Config,
  getBucketConfig,
  setupBucketCORS,
  initiateMultipartUpload,
  uploadPart,
  completeMultipartUpload,
  getObjectMetadata,
  copyObject,
  moveObject,
  generatePresignedUploadUrl,
  listObjects,
  deleteObjects,
  getObjectACL,
  setObjectACL,
  getBucketSize
};
