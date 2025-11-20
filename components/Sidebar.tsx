import React, { useEffect, useState, useRef } from 'react';
import { GeoCountry, Tab, Channel } from '../types';
import { fetchChannelsForCountry, testChannelUrl } from '../services/iptvService';
import { Tv, MessageSquare, X, Loader2, Play, Info, Wifi, WifiOff, Filter } from 'lucide-react';
import ChatAssistant from './ChatAssistant';
import VideoPlayer from './VideoPlayer';

interface SidebarProps {
  selectedCountry: GeoCountry | null;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedCountry, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHANNELS);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [filter, setFilter] = useState('');
  const [hideOffline, setHideOffline] = useState(true); // Default to true for better UX
  
  // verification queue refs
  const isUnmounted = useRef(false);
  const channelsRef = useRef<Channel[]>([]);

  useEffect(() => {
    // Reset state when country changes
    if (selectedCountry) {
      setActiveTab(Tab.CHANNELS);
      setActiveChannel(null);
      setChannels([]);
      setFilter('');
      isUnmounted.current = false;
      loadChannels(selectedCountry.code);
    }
    return () => {
      isUnmounted.current = true;
    };
  }, [selectedCountry]);

  const loadChannels = async (countryCode: string) => {
    setIsLoadingChannels(true);
    const data = await fetchChannelsForCountry(countryCode);
    setChannels(data);
    channelsRef.current = data;
    setIsLoadingChannels(false);
    
    // Start background verification
    verifyChannels(data);
  };

  const verifyChannels = async (channelList: Channel[]) => {
    // Process in batches of 5 to avoid network congestion
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < channelList.length; i += BATCH_SIZE) {
        if (isUnmounted.current) return;

        const batch = channelList.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (channel) => {
            const isWorking = await testChannelUrl(channel.streamUrl);
            return { id: channel.id, status: isWorking ? 'online' : 'offline' };
        });

        const results = await Promise.all(promises);
        
        if (isUnmounted.current) return;

        // Update state incrementally
        setChannels((prev) => {
            const next = [...prev];
            results.forEach((res) => {
                // @ts-ignore
                const idx = next.findIndex(c => c.id === res.id);
                if (idx !== -1) {
                    // @ts-ignore
                    next[idx] = { ...next[idx], status: res.status };
                }
            });
            return next;
        });
    }
  };

  const filteredChannels = channels.filter(c => {
    const matchesText = c.name.toLowerCase().includes(filter.toLowerCase()) || 
      (c.categories && c.categories.some(cat => cat.toLowerCase().includes(filter.toLowerCase())));
    
    const matchesStatus = hideOffline ? c.status !== 'offline' : true;
    
    return matchesText && matchesStatus;
  }).sort((a, b) => {
      // Sort online channels to top
      if (a.status === 'online' && b.status !== 'online') return -1;
      if (a.status !== 'online' && b.status === 'online') return 1;
      return 0;
  });

  if (!selectedCountry) {
    // Minimized state or welcome state
    return (
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-lg text-white max-w-xs animate-fade-in shadow-2xl">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                GlobalStream
            </h1>
            <p className="text-sm text-gray-300 mb-4">
                Real-time IPTV Channel Visualizer
            </p>
            <div className="text-xs text-gray-500 space-y-1">
                <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Spin the globe</p>
                <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Click a country</p>
                <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Watch live streams</p>
            </div>
        </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 h-full w-96 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 text-white flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out z-10">
      
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedCountry.flag}</span>
            <div>
                <h2 className="font-bold text-lg leading-tight text-white">{selectedCountry.name}</h2>
                <span className="text-xs text-gray-400 font-mono">{filteredChannels.length} Streams Found</span>
            </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/20">
        <button
          onClick={() => setActiveTab(Tab.CHANNELS)}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            activeTab === Tab.CHANNELS ? 'text-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Tv className="w-4 h-4" /> Channels
          {activeTab === Tab.CHANNELS && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400"></div>}
        </button>
        <button
          onClick={() => setActiveTab(Tab.CHAT)}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            activeTab === Tab.CHAT ? 'text-purple-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> AI Chat
          {activeTab === Tab.CHAT && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-400"></div>}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        
        {activeTab === Tab.CHANNELS && (
          <div className="flex flex-col h-full">
             
             {/* Player Section (Sticky) */}
             {activeChannel && (
                <div className="p-4 bg-black/40 border-b border-white/10">
                    <h3 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Now Playing
                    </h3>
                    <VideoPlayer url={activeChannel.streamUrl} />
                    <div className="mt-2 flex items-center justify-between">
                        <span className="font-medium truncate">{activeChannel.name}</span>
                        <button 
                          onClick={() => setActiveChannel(null)}
                          className="text-xs text-gray-500 hover:text-white underline"
                        >
                          Close Player
                        </button>
                    </div>
                </div>
             )}

             {/* Search / Filter */}
             <div className="p-3 border-b border-white/10 bg-white/5 space-y-2">
                <input 
                  type="text" 
                  placeholder="Search channels..." 
                  className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <button 
                    onClick={() => setHideOffline(!hideOffline)}
                    className={`w-full flex items-center justify-center gap-2 text-xs py-1.5 rounded border transition-colors ${
                        hideOffline 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                >
                    <Filter className="w-3 h-3" />
                    {hideOffline ? 'Hiding Offline Channels' : 'Show All (Including Offline)'}
                </button>
             </div>

             {/* Channel List */}
             <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {isLoadingChannels ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-sm">Scanning frequencies...</span>
                    </div>
                ) : filteredChannels.length > 0 ? (
                    filteredChannels.map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannel(channel)}
                            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all border border-transparent group ${
                                activeChannel?.id === channel.id 
                                    ? 'bg-blue-600/20 border-blue-500/50' 
                                    : 'hover:bg-white/5 hover:border-white/10'
                            }`}
                        >
                            <div className="w-10 h-10 bg-black/40 rounded flex items-center justify-center text-xs overflow-hidden shrink-0 border border-white/10 relative">
                                {channel.logo ? (
                                    <img src={channel.logo} alt="" className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : (
                                    <span className="text-gray-600 font-bold">{channel.name.substring(0,2)}</span>
                                )}
                                {/* Status Dot overlay on Logo */}
                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                                    channel.status === 'online' ? 'bg-green-500' : 
                                    channel.status === 'offline' ? 'bg-red-500' : 'bg-gray-500'
                                }`} title={channel.status}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="font-medium text-sm truncate text-gray-200 group-hover:text-white">
                                        {channel.name}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 truncate flex items-center gap-2">
                                    {channel.categories.length > 0 ? channel.categories.join(', ') : 'General'}
                                    {activeChannel?.id === channel.id && <span className="text-blue-400 font-bold">• Playing</span>}
                                </div>
                            </div>
                            
                            {/* Status Icon */}
                            {channel.status === 'online' ? (
                                <Wifi className="w-3 h-3 text-green-500" />
                            ) : channel.status === 'offline' ? (
                                <WifiOff className="w-3 h-3 text-red-500 opacity-50" />
                            ) : (
                                <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />
                            )}
                        </button>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No working channels found.</p>
                        <p className="text-xs mt-1">
                           {hideOffline ? "Try disabling the 'Hide Offline' filter." : "Try a different country."}
                        </p>
                    </div>
                )}
             </div>
             
             <div className="p-2 text-center border-t border-white/10 bg-black/20">
                <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
                    Data provided by iptv-org
                </a>
             </div>
          </div>
        )}

        {activeTab === Tab.CHAT && (
          <div className="h-full flex flex-col">
            <ChatAssistant contextCountry={selectedCountry.name} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;