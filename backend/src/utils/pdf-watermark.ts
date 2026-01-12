import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import sharp from 'sharp';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import QRCode from 'qrcode';

const execAsync = promisify(exec);

export interface WatermarkOptions {
  userEmail: string;
  userId: string;
  legalText?: string;
}

const DEFAULT_LEGAL_TEXT = 'CONTEÚDO CONFIDENCIAL • USO E REPRODUÇÃO PROIBIDOS • SUJEITO A PROVIDÊNCIAS LEGAIS';

/**
 * Apply watermark to an image buffer
 */
export async function applyWatermarkToImage(
  imageBuffer: Buffer,
  options: WatermarkOptions
): Promise<Buffer> {
  const { userEmail, userId, legalText = DEFAULT_LEGAL_TEXT } = options;
  
  // Load the image
  const image = await loadImage(imageBuffer);
  const width = image.width;
  const height = image.height;
  
  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(image, 0, 0, width, height);
  
  // Apply watermark pattern
  await applyWatermarkPattern(ctx, width, height, userEmail, userId, legalText);
  
  // Convert canvas to buffer
  return canvas.toBuffer('image/png');
}

/**
 * Apply repeating watermark pattern on canvas
 */
async function applyWatermarkPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  userEmail: string,
  userId: string,
  legalText: string
): Promise<void> {
  // Generate QR code as a data URL
  const qrDataUrl = await QRCode.toDataURL(userId, {
    width: 120,
    margin: 1,
    color: {
      dark: '#dc2626',
      light: '#ffffff00' // transparent background
    }
  });
  const qrImage = await loadImage(qrDataUrl);
  const qrSize = 65; // QR code size (smaller to fit more)
  
  ctx.save();
  
  // Draw QR codes in a well-spaced grid pattern (NOT rotated)
  const qrSpacingX = width / 8; // 8 QR codes per row
  const qrSpacingY = height / 8; // 8 QR codes per column
  
  ctx.globalAlpha = 0.35;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const posX = x * qrSpacingX + (qrSpacingX - qrSize) / 2;
      const posY = y * qrSpacingY + (qrSpacingY - qrSize) / 2;
      ctx.drawImage(qrImage, posX, posY, qrSize, qrSize);
    }
  }
  ctx.globalAlpha = 1.0;
  
  // Draw large text block in top-left corner (NOT rotated)
  const padding = 30;
  const lineHeight = 28;
  
  // Email text - large and bold
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  
  ctx.strokeText(userEmail.toUpperCase(), padding, padding + lineHeight);
  ctx.fillText(userEmail.toUpperCase(), padding, padding + lineHeight);
  
  // Legal text - smaller
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
  ctx.lineWidth = 1.5;
  
  // Split legal text into multiple lines if needed
  const maxWidth = width - padding * 2;
  const words = legalText.split(' ');
  let line = '';
  let yPosition = padding + lineHeight * 2 + 10;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.strokeText(line, padding, yPosition);
      ctx.fillText(line, padding, yPosition);
      line = words[i] + ' ';
      yPosition += 22;
    } else {
      line = testLine;
    }
  }
  
  // Draw remaining text
  ctx.strokeText(line, padding, yPosition);
  ctx.fillText(line, padding, yPosition);
  
  ctx.restore();
}

/**
 * Convert PDF URL to watermarked images
 * Returns array of image buffers (one per page)
 */
export async function convertPdfToWatermarkedImages(
  pdfUrl: string,
  options: WatermarkOptions
): Promise<Buffer[]> {
  try {
    // Fetch PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    
    // Create temp directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-watermark-'));
    const pdfPath = path.join(tempDir, 'input.pdf');
    const outputPrefix = path.join(tempDir, 'page');
    
    try {
      // Write PDF to temp file
      await fs.writeFile(pdfPath, pdfBuffer);
      
      // Convert PDF to PNG images using pdftoppm from Homebrew
      // -png: output format
      // -r 150: resolution (DPI)
      const command = `/opt/homebrew/bin/pdftoppm -png -r 150 "${pdfPath}" "${outputPrefix}"`;
      await execAsync(command);
      
      // Read generated images (pdftoppm creates files like page-1.png, page-2.png, etc.)
      const files = await fs.readdir(tempDir);
      const imageFiles = files
        .filter((f: string) => f.startsWith('page-') && f.endsWith('.png'))
        .sort((a, b) => {
          // Extract page numbers and sort numerically
          const numA = parseInt(a.match(/page-(\d+)\.png/)?.[1] || '0');
          const numB = parseInt(b.match(/page-(\d+)\.png/)?.[1] || '0');
          return numA - numB;
        });
      
      // Apply watermark to each image
      const watermarkedImages: Buffer[] = [];
      for (const file of imageFiles) {
        const imagePath = path.join(tempDir, file);
        const imageBuffer = await fs.readFile(imagePath);
        const watermarked = await applyWatermarkToImage(imageBuffer, options);
        watermarkedImages.push(watermarked);
      }
      
      return watermarkedImages;
    } finally {
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Error converting PDF to watermarked images:', error);
    throw error;
  }
}
