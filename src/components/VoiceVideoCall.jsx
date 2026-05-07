import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const VoiceVideoCall = ({ chat, show, onClose, callType = 'voice' }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected, ended
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callIntervalRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    if (show) {
      initializeCall();
    } else {
      endCall();
    }

    return () => {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    };
  }, [show]);

  useEffect(() => {
    if (callState === 'connected') {
      callIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    }
  }, [callState]);

  const initializeCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current && callType === 'video') {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Start the call
      await startCall();

    } catch (err) {
      console.error('Error initializing call:', err);
      setError('Failed to access camera/microphone');
    }
  };

  const startCall = async () => {
    setCallState('calling');
    
    // Notify other user about incoming call
    if (socket && chat && chat._id) {
      socket.emit('call_user', {
        chatId: chat._id,
        callerId: user?.id,
        callerName: user?.username,
        callType,
        signalData: null // Will be populated with WebRTC signal
      });
    }

    // Create offer
    try {
      const peerConnection = peerConnectionRef.current;
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to backend
      const token = localStorage.getItem('cipherchat_token');
      const response = await fetch(`${API_URL}/calls/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: chat._id,
          callType,
          offer: offer
        }),
      });

      if (response.ok) {
        setCallState('ringing');
      } else {
        setError('Failed to start call');
      }
    } catch (err) {
      console.error('Error starting call:', err);
      setError('Failed to start call');
    }
  };

  const endCall = async () => {
    setCallState('ended');
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Notify other user
    if (socket && chat && chat._id) {
      socket.emit('end_call', {
        chatId: chat._id,
        callerId: user?.id
      });
    }

    // End call on backend
    try {
      const token = localStorage.getItem('cipherchat_token');
      await fetch(`${API_URL}/calls/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: chat?._id
        }),
      });
    } catch (err) {
      console.error('Error ending call:', err);
    }

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Implement speaker toggle logic
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStateText = () => {
    switch (callState) {
      case 'calling': return 'Calling...';
      case 'ringing': return 'Ringing...';
      case 'connected': return 'Connected';
      case 'ended': return 'Call Ended';
      default: return 'Initializing...';
    }
  };

  const getCallStateColor = () => {
    switch (callState) {
      case 'calling': return 'text-warning';
      case 'ringing': return 'text-info';
      case 'connected': return 'text-success';
      case 'ended': return 'text-danger';
      default: return 'text-muted';
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="modal-dialog modal-dialog-centered modal-fullscreen">
        <div className="modal-content bg-dark border-success">
          <div className="modal-header border-secondary d-flex justify-content-between align-items-center">
            <div>
              <h5 className="modal-title text-success">
                {callType === 'video' ? 'Video Call' : 'Voice Call'}
              </h5>
              <small className={getCallStateColor()}>{getCallStateText()}</small>
              {callState === 'connected' && (
                <small className="text-success ms-2">{formatCallDuration(callDuration)}</small>
              )}
            </div>
            <button 
              type="button" 
              className="btn btn-danger btn-sm" 
              onClick={endCall}
              disabled={callState === 'ended'}
            >
              <i className="bi bi-telephone-fill"></i> End Call
            </button>
          </div>
          
          <div className="modal-body p-0">
            {error && (
              <div className="alert alert-danger m-3">
                {error}
              </div>
            )}

            {callType === 'video' ? (
              <div className="video-call-container" style={{ height: '70vh', position: 'relative' }}>
                {/* Remote Video */}
                <div className="remote-video w-100 h-100 bg-black d-flex align-items-center justify-content-center">
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-100 h-100"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="text-center">
                      <img
                        src={chat?.participants?.find(p => p.user._id !== user?.id)?.user?.avatar || `https://ui-avatars.com/api/?name=${chat?.participants?.find(p => p.user._id !== user?.id)?.user?.username}&background=28a745&color=fff&size=100`}
                        alt="User"
                        className="rounded-circle mb-3"
                        width="100"
                        height="100"
                      />
                      <h5 className="text-light">
                        {chat?.participants?.find(p => p.user._id !== user?.id)?.user?.username}
                      </h5>
                      <p className={getCallStateColor()}>{getCallStateText()}</p>
                    </div>
                  )}
                </div>

                {/* Local Video */}
                <div className="local-video position-absolute bottom-0 end-0 m-3">
                  <div className="bg-dark rounded" style={{ width: '150px', height: '200px' }}>
                    {localStream ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-100 h-100 rounded"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                        <i className="bi bi-person-video text-muted" style={{ fontSize: '2rem' }}></i>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="voice-call-container d-flex flex-column align-items-center justify-content-center" style={{ height: '70vh' }}>
                <img
                  src={chat?.participants?.find(p => p.user._id !== user?.id)?.user?.avatar || `https://ui-avatars.com/api/?name=${chat?.participants?.find(p => p.user._id !== user?.id)?.user?.username}&background=28a745&color=fff&size=150`}
                  alt="User"
                  className="rounded-circle mb-3"
                  width="150"
                  height="150"
                />
                <h3 className="text-light">
                  {chat?.participants?.find(p => p.user._id !== user?.id)?.user?.username}
                </h3>
                <p className={getCallStateColor()}>{getCallStateText()}</p>
                {callState === 'connected' && (
                  <h2 className="text-success">{formatCallDuration(callDuration)}</h2>
                )}
              </div>
            )}

            {/* Call Controls */}
            <div className="call-controls bg-secondary p-3 d-flex justify-content-center gap-3">
              <button
                className={`btn ${isMuted ? 'btn-danger' : 'btn-outline-success'}`}
                onClick={toggleMute}
                disabled={callState !== 'connected'}
              >
                <i className={`bi ${isMuted ? 'bi-mic-mute-fill' : 'bi-mic-fill'}`}></i>
              </button>

              {callType === 'video' && (
                <button
                  className={`btn ${isVideoOn ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={toggleVideo}
                  disabled={callState !== 'connected'}
                >
                  <i className={`bi ${isVideoOn ? 'bi-camera-video-fill' : 'bi-camera-video-off-fill'}`}></i>
                </button>
              )}

              <button
                className={`btn ${isSpeakerOn ? 'btn-success' : 'btn-outline-success'}`}
                onClick={toggleSpeaker}
                disabled={callState !== 'connected'}
              >
                <i className={`bi ${isSpeakerOn ? 'bi-speaker-fill' : 'bi-speaker'}`}></i>
              </button>

              <button className="btn btn-danger" onClick={endCall}>
                <i className="bi bi-telephone-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceVideoCall;
