import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw, WifiOff, ShieldAlert } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  autoPlay?: boolean;
}

declare global {
  interface Window {
    Hls: any;
  }
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, autoPlay = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hlsRef = useRef<any>(null);

  // Check for Mixed Content (HTTP stream on HTTPS site)
  const isMixedContent = 
    typeof window !== 'undefined' && 
    window.location.protocol === 'https:' && 
    url.startsWith('http:');

  const initPlayer = () => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Mixed Content Warning
    if (isMixedContent) {
      setError({
        title: "Security Restriction",
        message: "This stream is insecure (HTTP) and cannot be played on this secure (HTTPS) page. Most browsers block this."
      });
      setIsLoading(false);
      return;
    }

    const handleNativeError = (e: any) => {
        const err = video.error;
        console.error("Native Video Error:", err, e);
        let msg = "An unknown error occurred.";
        if (err) {
            switch (err.code) {
                case 1: msg = "The fetching of the associated resource was aborted by the user's request."; break;
                case 2: msg = "A network error occurred causing the video download to fail entirely."; break;
                case 3: msg = "The video has been found to be corrupted or invalid."; break;
                case 4: msg = "The video format is not supported or stream is unavailable."; break;
            }
        }
        setError({ title: "Playback Error", message: msg });
        setIsLoading(false);
    };

    const handleSuccess = () => {
        setIsLoading(false);
    };

    // 1. Try HLS.js
    if (window.Hls && window.Hls.isSupported() && (url.includes('.m3u8') || !video.canPlayType('application/vnd.apple.mpegurl'))) {
      const hls = new window.Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
      });
      
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
            video.play().catch(e => console.warn("Auto-play blocked:", e));
        }
      });

      hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
        console.warn("HLS Error:", data.type, data.details, data);
        if (data.fatal) {
          switch (data.type) {
            case window.Hls.ErrorTypes.NETWORK_ERROR:
              console.log("fatal network error encountered, try to recover");
              hls.startLoad();
              break;
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              console.log("fatal media error encountered, try to recover");
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError({ 
                  title: "Stream Error", 
                  message: "The live stream is currently unavailable or incompatible." 
              });
              setIsLoading(false);
              break;
          }
        }
      });

    } 
    // 2. Try Native HLS (Safari)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', handleSuccess);
      video.addEventListener('error', handleNativeError);
      if (autoPlay) {
        video.play().catch(e => console.warn("Auto-play blocked:", e));
      }
    } 
    // 3. Direct Fallback (MP4 etc)
    else {
      video.src = url;
      video.addEventListener('loadeddata', handleSuccess);
      video.addEventListener('error', handleNativeError);
      if (autoPlay) {
        video.play().catch(e => console.warn("Auto-play blocked:", e));
      }
    }
  };

  useEffect(() => {
    initPlayer();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      // Listeners on DOM elements are auto-garbage collected when element is removed usually, 
      // but ideally we remove named listeners. 
      // Since we re-render on URL change, it's acceptable here for simplicity 
      // assuming the video element is recreated or ref changed.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleRetry = () => {
    initPlayer();
  };

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative border border-white/20 shadow-lg group">
      
      {/* Loading State */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 space-y-2">
           <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
           <span className="text-xs text-gray-400">Connecting to satellite...</span>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20 text-white p-6 text-center">
           {error.title === 'Security Restriction' ? (
             <ShieldAlert className="w-10 h-10 text-amber-500 mb-2" />
           ) : (
             <WifiOff className="w-10 h-10 text-red-500 mb-2" />
           )}
           <h4 className="font-bold text-sm mb-1">{error.title}</h4>
           <p className="text-xs text-gray-400 mb-4 max-w-[80%]">{error.message}</p>
           
           <button 
             onClick={handleRetry}
             className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium transition-colors"
           >
             <RefreshCw className="w-3 h-3" /> Retry Connection
           </button>
        </div>
      )}

      {/* Video Element */}
      <video 
        ref={videoRef} 
        controls 
        className="w-full h-full object-contain" 
        playsInline
        poster="https://via.placeholder.com/640x360/000000/ffffff?text=GlobalStream+IPTV"
      />
    </div>
  );
};

export default VideoPlayer;