"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface PdfViewerProps {
  parentTaskId: string;
  fileName: string;
}

interface WatermarkedImage {
  page: number;
  data: string; // base64
  mimeType: string;
}

interface WatermarkedPdfResponse {
  fileName: string;
  totalPages: number;
  images: WatermarkedImage[];
}

export function PdfViewer({ parentTaskId, fileName }: PdfViewerProps) {
  const [images, setImages] = useState<WatermarkedImage[]>([]);
  const [actualFileName, setActualFileName] = useState<string>(fileName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWatermarkedPdf();
  }, [parentTaskId]);

  const loadWatermarkedPdf = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<WatermarkedPdfResponse>(
        `/data-labeling/pdf-watermarked/${parentTaskId}`
      );

      setImages(response.data.images);
      // Use the fileName from backend response to ensure it matches the content
      setActualFileName(response.data.fileName);
    } catch (err: any) {
      console.error("Error loading watermarked PDF:", err);
      setError(err.response?.data?.error || "Erro ao carregar PDF");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-8 bg-gray-50 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando PDF com marca d'água...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-8 bg-red-50 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="border rounded-lg overflow-hidden bg-gray-50 select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        return false;
      }}
      style={{ userSelect: "none" }}
    >
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
        <span className="text-sm font-medium">📄 {actualFileName}</span>
        <span className="text-xs text-gray-400">
          {images.length} página{images.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4 space-y-4">
        {images.map((image) => (
          <div
            key={image.page}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="bg-gray-100 px-3 py-1 text-xs text-gray-600">
              Página {image.page}
            </div>
            <img
              src={`data:${image.mimeType};base64,${image.data}`}
              alt={`Página ${image.page}`}
              className="w-full select-none pointer-events-none"
              draggable={false}
              onContextMenu={(e) => {
                e.preventDefault();
                return false;
              }}
              style={{ userSelect: "none" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
