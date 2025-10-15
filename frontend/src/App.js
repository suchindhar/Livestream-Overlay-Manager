import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [overlays, setOverlays] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState('youtube');
  const [showForm, setShowForm] = useState(false);
  const videoContainerRef = useRef(null);
  const [activeDrag, setActiveDrag] = useState(null); 

  const [newOverlay, setNewOverlay] = useState({
    content: 'LIVE',
    type: 'text',
    imageUrl: '',
    position: { x: 50, y: 50 },
    size: { width: 200, height: 60 },
    style: {
      fontSize: '24px',
      color: '#FFFFFF',
      backgroundColor: 'rgba(220, 20, 60, 0.8)',
    },
  });
  
  // --- API Functions (Defined first for stability) ---

  // 1. Stable Update Function: Uses useCallback with an empty dependency array
  // to prevent unnecessary re-renders and ensure stability when called by drag events.
  const updateOverlayPosition = useCallback(async (id, pos) => {
    try {
      // Optimistically update the local state first
      setOverlays(prevOverlays => 
        prevOverlays.map(o => o.id === id ? { ...o, position: pos } : o)
      );
      // Send the update to the backend
      await axios.put(`${API_URL}/overlays/${id}`, { position: pos });
      console.log(`Successfully updated overlay ${id} position.`);
    } catch (err) {
      console.error('Failed to update position:', err.response?.data || err.message);
      // NOTE: If this fails, check your Flask server console for the error message.
    }
  }, []); 

  // Fetch overlays (runs once on load)
  useEffect(() => {
    axios.get(`${API_URL}/overlays`)
      .then(res => setOverlays(res.data.overlays || []))
      .catch(err => {
        console.error('Failed to fetch overlays. Is the API running?', err.response?.data || err.message);
      });
  }, []);

  const createOverlay = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/overlays`, newOverlay);
      setOverlays([...overlays, res.data.overlay]);
      setShowForm(false);
      setNewOverlay(prev => ({ ...prev, content: 'LIVE', imageUrl: '', position: { x: 250, y: 150 } }));
    } catch (err) {
      console.error('Failed to create overlay.', err.response?.data || err.message);
      alert('❌ Failed to create overlay. Check API status.');
    }
  };

  const deleteOverlay = async (id) => {
    if (!window.confirm('Delete this overlay?')) return;
    try {
      await axios.delete(`${API_URL}/overlays/${id}`);
      setOverlays(overlays.filter(o => o.id !== id));
    } catch (err) {
      console.error('Delete failed:', err.response?.data || err.message);
      alert('❌ Delete failed');
    }
  };
  
  // --- Video Loading Functions ---

  const loadYouTube = (url) => {
    let videoId = '';
    try {
      const urlObj = new URL(
        url.startsWith('http') ? url : `https://www.youtube.com/watch?v=${url}`
      );
      videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      if (videoId.length > 11) videoId = videoId.substring(0, 11);
    } catch (e) {
      if (url.length === 11) videoId = url;
    }
    if (videoId) {
      setVideoUrl(videoId);
      setVideoType('youtube');
    } else {
      alert('❌ Invalid YouTube URL or ID');
    }
  };

  const loadLocalFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoType === 'local' && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoType('local');
      e.target.value = null;
    }
  };


  // --- NATIVE DRAG LOGIC ---

  const handleMouseDown = (e, overlay) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    const overlayElement = e.currentTarget;
    const offsetX = e.clientX - overlayElement.getBoundingClientRect().left;
    const offsetY = e.clientY - overlayElement.getBoundingClientRect().top;

    setActiveDrag({
      id: overlay.id,
      offsetX,
      offsetY,
      size: overlay.size
    });
  };

  // Memoized handler to update position during drag (visual update)
  const handleMouseMove = useCallback((e) => {
    if (!activeDrag) return;
    
    e.preventDefault(); 
    e.stopPropagation();

    if (!videoContainerRef.current) return;
    
    const containerRect = videoContainerRef.current.getBoundingClientRect();
    const { id, offsetX, offsetY, size } = activeDrag;

    let newX = e.clientX - containerRect.left - offsetX;
    let newY = e.clientY - containerRect.top - offsetY;

    const overlayWidth = size?.width || 200;
    const overlayHeight = size?.height || 60;

    newX = Math.max(0, Math.min(newX, containerRect.width - overlayWidth));
    newY = Math.max(0, Math.min(newY, containerRect.height - overlayHeight));

    // Update the local state for instant visual feedback
    setOverlays(prevOverlays => prevOverlays.map(o => {
      if (o.id === id) {
        return { ...o, position: { x: newX, y: newY } };
      }
      return o;
    }));
  }, [activeDrag]);

  // Memoized handler to save the final position (API call)
  const handleMouseUp = useCallback(() => {
    if (!activeDrag) return;
    
    const { id } = activeDrag;

    // Use a state update function to access the absolute LATEST state of 'overlays'
    setOverlays(prevOverlays => {
      const finalOverlay = prevOverlays.find(o => o.id === id);
      
      if (finalOverlay) {
        // Call the API with the latest position using the stable updateOverlayPosition function
        updateOverlayPosition(id, finalOverlay.position);
      }
      return prevOverlays;
    });

    setActiveDrag(null);
  }, [activeDrag, updateOverlayPosition]);


  // Attach global event listeners when dragging starts
  useEffect(() => {
    if (activeDrag) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } 

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag, handleMouseMove, handleMouseUp]);


  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', padding: '20px', background: '#f5f7fa', minHeight: '100vh' }}>
      
      {/* Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="YouTube URL or ID (RTSP Placeholder)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          style={{ padding: '10px', width: '300px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button
          onClick={() => loadYouTube(videoUrl)}
          style={{ padding: '10px 16px', background: '#ff0000', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          🎬 Load Stream
        </button>
        <label style={{ padding: '10px 16px', background: '#4CAF50', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
          📁 Upload Local Video
          <input
            type="file"
            accept="video/*"
            onChange={loadLocalFile}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Video + Overlays Container */}
      <div 
        ref={videoContainerRef}
        style={{ position: 'relative', width: '100%', height: '500px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}
      >
        {videoUrl ? (
          <>
            {videoType === 'youtube' ? (
                // RELIABLE YOUTUBE EMBED (iFrame)
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoUrl}?autoplay=0&controls=1&rel=0`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                ></iframe>
            ) : (
              <video
                src={videoUrl}
                controls
                style={{ width: '100%', height: '100%' }}
              />
            )}
            
            {/* Custom Draggable Overlays */}
            {overlays.map((overlay) => (
              <div
                key={overlay.id}
                onMouseDown={(e) => handleMouseDown(e, overlay)} 
                style={{
                  position: 'absolute',
                  transform: `translate(${overlay.position.x}px, ${overlay.position.y}px)`,
                  width: overlay.size.width,
                  height: overlay.size.height,
                  fontSize: overlay.style.fontSize,
                  color: overlay.style.color,
                  backgroundColor: overlay.style.backgroundColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'move', 
                  userSelect: 'none',
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  zIndex: activeDrag?.id === overlay.id ? 1000 : 999,
                }}
              >
                  {overlay.type === 'text' ? (
                    <span>{overlay.content}</span>
                  ) : (
                    <img
                      src={overlay.imageUrl}
                      alt="overlay"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                  <button
                    onClick={() => deleteOverlay(overlay.id)}
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '-10px',
                      background: 'red',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      zIndex: 1001,
                    }}
                  >
                    ×
                  </button>
              </div>
            ))}
          </>
        ) : (
          <div style={{ color: '#fff', textAlign: 'center', paddingTop: '200px' }}>
            <h3>🎥 No video loaded</h3>
            <p>Enter a YouTube URL/ID or upload a local video</p>
          </div>
        )}
      </div>

      {/* Overlay Manager */}
      <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '10px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {showForm ? '❌ Cancel' : '➕ Add Overlay'}
        </button>

        {showForm && (
          <form onSubmit={createOverlay} style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ marginRight: '10px' }}>
                <input
                  type="radio"
                  name="type"
                  checked={newOverlay.type === 'text'}
                  onChange={() => setNewOverlay({ ...newOverlay, type: 'text' })}
                /> Text
              </label>
              <label>
                <input
                  type="radio"
                  name="type"
                  checked={newOverlay.type === 'image'}
                  onChange={() => setNewOverlay({ ...newOverlay, type: 'image' })}
                /> Image
              </label>
            </div>

            {newOverlay.type === 'image' && (
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Image URL (e.g., https://example.com/logo.png)"
                  value={newOverlay.imageUrl}
                  onChange={(e) => setNewOverlay({ ...newOverlay, imageUrl: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder={newOverlay.type === 'text' ? "Overlay text" : "Alt text"}
                value={newOverlay.content}
                onChange={(e) => setNewOverlay({ ...newOverlay, content: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Font size (e.g., 24px)"
                value={newOverlay.style.fontSize}
                onChange={(e) => setNewOverlay({ ...newOverlay, style: { ...newOverlay.style, fontSize: e.target.value } })}
                style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <input
                type="color"
                value={newOverlay.style.color}
                onChange={(e) => setNewOverlay({ ...newOverlay, style: { ...newOverlay.style, color: e.target.value } })}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            <button
              type="submit"
              style={{ padding: '10px 20px', background: '#9C27B0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Create Overlay
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px' }}>
          <h4>Saved Overlays ({overlays.length})</h4>
          {overlays.length === 0 ? (
            <p style={{ color: '#888' }}>No overlays yet. Create one above to get started.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {overlays.map((o) => (
                <li key={o.id} style={{ padding: '8px', background: '#f9f9f9', margin: '4px 0', borderRadius: '4px' }}>
                  <strong>{o.content || o.imageUrl}</strong> ({o.type})
                  <button
                    onClick={() => deleteOverlay(o.id)}
                    style={{ float: 'right', background: '#f44336', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;