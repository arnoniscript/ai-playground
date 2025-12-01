"use client";

import { useEffect, useRef } from "react";

interface ModelEmbedProps {
  embedCode: string;
  modelKey: string;
  modelName?: string;
}

export function ModelEmbed({
  embedCode,
  modelKey,
  modelName,
}: ModelEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = "";

    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = embedCode;

    // Extract scripts
    const scripts = tempDiv.querySelectorAll("script");
    const scriptContents: string[] = [];

    scripts.forEach((script) => {
      if (script.src) {
        // External script
        const newScript = document.createElement("script");
        newScript.src = script.src;
        newScript.async = true;
        containerRef.current?.appendChild(newScript);
      } else if (script.textContent) {
        // Inline script - save for later execution
        scriptContents.push(script.textContent);
      }
      // Remove script from tempDiv
      script.remove();
    });

    // Append remaining HTML (without scripts)
    containerRef.current.appendChild(tempDiv);

    // Execute inline scripts after DOM is ready
    scriptContents.forEach((content) => {
      try {
        // Use Function constructor for safer eval
        const func = new Function(content);
        func();
      } catch (error) {
        console.error("Error executing embed script:", error);
      }
    });

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [embedCode]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {modelName && (
        <div className="mb-4 pb-4 border-b">
          <h3 className="text-xl font-semibold text-gray-900">{modelName}</h3>
          <p className="text-sm text-gray-500 mt-1">Modelo {modelKey}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="eleven-labs-embed min-h-[200px]"
        data-model-key={modelKey}
      />

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          💬 Interaja com o modelo acima antes de responder as perguntas abaixo.
        </p>
      </div>
    </div>
  );
}
