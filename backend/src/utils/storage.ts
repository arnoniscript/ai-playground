import { db } from '../db/client.js';
import { decode } from 'base64-arraybuffer';

/**
 * Upload a base64 image to Supabase Storage
 * @param base64Data Base64 encoded image data (with or without data URI prefix)
 * @param bucket Bucket name ('qa-documents' or 'qa-selfies')
 * @param userId User ID for folder organization
 * @param filename Original filename
 * @returns Public URL of uploaded file
 */
export async function uploadBase64Image(
  base64Data: string,
  bucket: string,
  userId: string,
  filename: string
): Promise<{ url: string; path: string }> {
  try {
    // Remove data URI prefix if present
    const base64String = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // Validate file size (2MB max)
    // Base64 has ~33% overhead, so we check the decoded size
    const sizeInBytes = (base64String.length * 3) / 4;
    const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
    
    if (sizeInBytes > maxSizeInBytes) {
      throw new Error('File size exceeds 2MB limit');
    }

    // Decode base64 to ArrayBuffer
    const arrayBuffer = decode(base64String);

    // Detect file extension and content type
    let ext = 'jpg';
    let contentType = 'image/jpeg';
    
    // Extract from data URI if present
    if (base64Data.includes(',')) {
      const dataUriPrefix = base64Data.split(',')[0];
      if (dataUriPrefix.includes('image/png')) {
        ext = 'png';
        contentType = 'image/png';
      } else if (dataUriPrefix.includes('image/jpeg') || dataUriPrefix.includes('image/jpg')) {
        ext = 'jpg';
        contentType = 'image/jpeg';
      } else if (dataUriPrefix.includes('application/pdf')) {
        ext = 'pdf';
        contentType = 'application/pdf';
      }
    } else if (filename) {
      // Fallback to filename extension
      const fileExt = filename.split('.').pop()?.toLowerCase();
      if (fileExt === 'png') {
        ext = 'png';
        contentType = 'image/png';
      } else if (fileExt === 'pdf') {
        ext = 'pdf';
        contentType = 'application/pdf';
      } else if (fileExt === 'jpg' || fileExt === 'jpeg') {
        ext = 'jpg';
        contentType = 'image/jpeg';
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const path = `${userId}/${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await db.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType: contentType,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = db.storage.from(bucket).getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Error in uploadBase64Image:', error);
    throw error;
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket Bucket name
 * @param path File path
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<void> {
  try {
    const { error } = await db.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteFile:', error);
    throw error;
  }
}

/**
 * Get signed URL for private file access (valid for 1 hour)
 * @param bucket Bucket name
 * @param path File path
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: string,
  path: string
): Promise<string> {
  try {
    const { data, error } = await db.storage
      .from(bucket)
      .createSignedUrl(path, 604800); // 1 week (7 days)

    if (error || !data) {
      console.error('Error creating signed URL:', error);
      throw new Error('Failed to create signed URL');
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedUrl:', error);
    throw error;
  }
}

/**
 * Upload QA document (ID, passport, etc)
 * @param base64Data Base64 encoded document image
 * @param userId User ID
 * @param documentType Type of document for filename
 * @returns URL of uploaded document
 */
export async function uploadQADocument(
  base64Data: string,
  userId: string,
  documentType: string = 'document'
): Promise<string> {
  const { url } = await uploadBase64Image(
    base64Data,
    'qa-documents',
    userId,
    `${documentType}.jpg`
  );
  return url;
}

/**
 * Upload QA selfie
 * @param base64Data Base64 encoded selfie image
 * @param userId User ID
 * @returns URL of uploaded selfie
 */
export async function uploadQASelfie(
  base64Data: string,
  userId: string
): Promise<string> {
  const { url } = await uploadBase64Image(
    base64Data,
    'qa-selfies',
    userId,
    'selfie.jpg'
  );
  return url;
}
