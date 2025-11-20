import React, { useState, useRef } from 'react';
import { generateVeoVideo } from '../services/geminiService';
import { Video, Loader2, Upload, Film } from 'lucide-react';

const VeoStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string>('image/png');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Extract raw base64 (remove data:image/xxx;base64, prefix)
        const parts = base64String.split(',');
        if (parts.length === 2) {
             setSelectedImage(parts[1]);
             setSelectedMimeType(file.type);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setIsGenerating(true);
    setVideoUrl(null);
    try {
      const url = await generateVeoVideo(prompt, selectedImage, selectedMimeType);
      setVideoUrl(url);
    } catch (e) {
      alert("Failed to generate video. Please ensure you have access to Veo models.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Film className="w-5 h-5 text-purple-400" />
          Veo Video Creator
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Upload a static image (e.g., a channel logo or scenery) and animate it with AI.
        </p>
        
        {/* Image Upload */}
        <div 
          className="border-2 border-dashed border-white/20 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
           {selectedImage ? (
             <img 
                src={`data:${selectedMimeType};base64,${selectedImage}`} 
                alt="Preview" 
                className="max-h-48 rounded shadow-lg"
             />
           ) : (
             <>
               <Upload className="w-8 h-8 text-gray-400 mb-2" />
               <span className="text-sm text-gray-400">Click to upload image</span>
             </>
           )}
           <input 
             ref={fileInputRef}
             type="file" 
             accept="image/*" 
             className="hidden"
             onChange={handleFileChange}
           />
        </div>

        {/* Prompt */}
        <div className="mt-4">
          <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Prompt</label>
          <textarea
            className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-purple-500 text-white"
            rows={2}
            placeholder="Describe how the image should move (e.g., 'Camera pans right over the city lights')..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!selectedImage || isGenerating}
          className={`mt-4 w-full py-2 px-4 rounded flex items-center justify-center gap-2 font-medium transition-colors ${
            !selectedImage || isGenerating 
              ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              Generate Video
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {videoUrl && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10 animate-fade-in">
          <h4 className="text-sm font-medium mb-2 text-green-400">Generation Complete</h4>
          <video controls src={videoUrl} className="w-full rounded-lg shadow-lg border border-white/10" />
        </div>
      )}
    </div>
  );
};

export default VeoStudio;
