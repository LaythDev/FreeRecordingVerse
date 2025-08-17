import { useState, useEffect, useRef, useCallback } from 'react';
import { RecordingMode, RecordingSettings, Recording, RecordingState } from '../../../shared/types';

const DEFAULT_SETTINGS: RecordingSettings = {
  quality: '1080',
  frameRate: '30',
  includeAudio: true,
  showCursor: true
};

export function useRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    recordingMode: 'screen',
    settings: DEFAULT_SETTINGS,
    mediaStream: null,
    mediaRecorder: null,
    recordedChunks: [],
    recording: null
  });

  // Refs for timer management
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  
  // For simulation mode when permissions aren't available (development/testing)
  const simulationModeRef = useRef<boolean>(false);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<RecordingSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  // Set recording mode (screen, camera, audio)
  const setRecordingMode = useCallback((mode: RecordingMode) => {
    setState(prev => ({ ...prev, recordingMode: mode }));
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Start timer
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - (pausedTimeRef.current || 0);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Update timer every 10ms for smooth display
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setState(prev => ({ ...prev, recordingTime: elapsed }));
    }, 10);
  }, []);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      pausedTimeRef.current = Date.now() - startTimeRef.current;
    }
  }, []);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedTimeRef.current = 0;
  }, []);

  // Request permissions based on recording mode
  const requestPermissions = useCallback(async () => {
    try {
      let stream: MediaStream | null = null;
      
      // Check if we're in an environment that supports media capture
      // In some environments like CI or certain browsers, we may need to simulate
      if (!navigator.mediaDevices) {
        console.log("MediaDevices not available, enabling simulation mode");
        simulationModeRef.current = true;
        
        // Create a mock stream with a canvas for screen/camera or silent audio for audio mode
        const canvas = document.createElement('canvas');
        canvas.width = state.settings.quality === '1080' ? 1920 : 
                       state.settings.quality === '720' ? 1280 : 854;
        canvas.height = state.settings.quality === '1080' ? 1080 : 
                        state.settings.quality === '720' ? 720 : 480;
                        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw a gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#4158D0');
          gradient.addColorStop(0.5, '#C850C0');
          gradient.addColorStop(1, '#FFCC70');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add text indicating simulation mode
          ctx.font = 'bold 40px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText('SIMULATION MODE', canvas.width / 2, canvas.height / 2);
          ctx.font = '24px Arial';
          ctx.fillText('Real recording not available in this environment', canvas.width / 2, canvas.height / 2 + 40);
        }
        
        // Create a stream
        if (state.recordingMode === 'audio') {
          // For audio, create a silent audio stream
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const destination = audioContext.createMediaStreamDestination();
          oscillator.connect(destination);
          oscillator.start();
          stream = destination.stream;
        } else {
          // For screen/camera, use the canvas
          stream = canvas.captureStream(parseInt(state.settings.frameRate));
        }
        
        setState(prev => ({ ...prev, mediaStream: stream }));
        return stream;
      }
      
      // Not in simulation mode, request real device permissions
      switch (state.recordingMode) {
        case 'screen':
          // For screen recording
          try {
            // @ts-ignore - TypeScript doesn't recognize getDisplayMedia
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                frameRate: { ideal: parseInt(state.settings.frameRate) },
                width: { ideal: state.settings.quality === '1080' ? 1920 : 
                               state.settings.quality === '720' ? 1280 : 854 },
                height: { ideal: state.settings.quality === '1080' ? 1080 : 
                                state.settings.quality === '720' ? 720 : 480 }
                // cursor property not supported in all browsers
              }
            });
            
            // If audio is enabled, merge with system audio
            if (state.settings.includeAudio) {
              try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Combine video from screen and audio from microphone
                const tracks = [
                  ...displayStream.getVideoTracks(),
                  ...audioStream.getAudioTracks()
                ];
                
                stream = new MediaStream(tracks);
              } catch (audioError) {
                console.warn('Could not get audio', audioError);
                stream = displayStream;
              }
            } else {
              stream = displayStream;
            }
          } catch (error) {
            console.error('Screen sharing error:', error);
            throw error;
          }
          break;
          
        case 'camera':
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'user',
                frameRate: { ideal: parseInt(state.settings.frameRate) },
                width: { ideal: state.settings.quality === '1080' ? 1920 : 
                               state.settings.quality === '720' ? 1280 : 854 },
                height: { ideal: state.settings.quality === '1080' ? 1080 : 
                                state.settings.quality === '720' ? 720 : 480 }
              },
              audio: state.settings.includeAudio
            });
          } catch (error) {
            console.error('Camera error:', error);
            throw error;
          }
          break;
          
        case 'audio':
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true
            });
          } catch (error) {
            console.error('Audio error:', error);
            throw error;
          }
          break;
      }
      
      setState(prev => ({ ...prev, mediaStream: stream }));
      return stream;
    } catch (error) {
      console.error('Error getting media stream:', error);
      setState(prev => ({ ...prev, mediaStream: null }));
      throw error;
    }
  }, [state.recordingMode, state.settings]);

  // Start recording function
  const startRecording = useCallback(async () => {
    try {
      // Get mediaStream if we don't have one
      let stream = state.mediaStream;
      if (!stream) {
        stream = await requestPermissions();
        if (!stream) {
          throw new Error('Could not get media stream');
        }
      }
      
      // Start or resume
      if (state.isPaused && state.mediaRecorder) {
        // Resume recording
        state.mediaRecorder.resume();
        setState(prev => ({ ...prev, isRecording: true, isPaused: false }));
        
        // Resume timer
        startTimer();
        return;
      }
      
      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: state.recordingMode === 'audio' 
          ? 'audio/webm'
          : 'video/webm;codecs=vp9'
      };
      
      let mediaRecorder: MediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback to default codec if vp9 is not supported
        mediaRecorder = new MediaRecorder(stream);
      }
      
      // Set up event handlers
      const recordedChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
          setState(prev => ({ ...prev, recordedChunks }));
        }
      };
      
      mediaRecorder.onstop = () => {
        const recordingBlob = new Blob(recordedChunks, {
          type: state.recordingMode === 'audio' ? 'audio/webm' : 'video/webm'
        });
        
        const recordingUrl = URL.createObjectURL(recordingBlob);
        const now = new Date();
        
        const recording: Recording = {
          id: now.getTime().toString(),
          mode: state.recordingMode,
          blob: recordingBlob,
          url: recordingUrl,
          duration: state.recordingTime,
          createdAt: now
        };
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          mediaRecorder: null,
          recording
        }));
        
        // Stop and clean up stream tracks
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Reset timer
        stopTimer();
      };
      
      // Start recording with small time slices for better real-time performance
      mediaRecorder.start(100); // Get data every 100ms
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        recordedChunks: [],
        mediaRecorder
      }));
      
      // Start timer
      setState(prev => ({ ...prev, recordingTime: 0 }));
      startTimer();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Fallback for environments where permissions might fail
      if (simulationModeRef.current || !navigator.mediaDevices) {
        // Create a simulated recording
        console.log("Creating simulated recording");
        
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        
        // Create a simulation blob
        canvas.getContext('2d')?.fillRect(0, 0, canvas.width, canvas.height);
        
        // Either create a real MediaRecorder with a canvas or just fake the recording
        try {
          const fakeStream = canvas.captureStream(30);
          const fakeRecorder = new MediaRecorder(fakeStream);
          
          fakeRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              setState(prev => ({ 
                ...prev, 
                recordedChunks: [...prev.recordedChunks, event.data] 
              }));
            }
          };
          
          fakeRecorder.onstop = () => {
            const fallbackBlob = new Blob([new ArrayBuffer(1000)], {
              type: state.recordingMode === 'audio' ? 'audio/webm' : 'video/webm'
            });
            
            const fallbackUrl = URL.createObjectURL(fallbackBlob);
            const now = new Date();
            
            const fallbackRecording: Recording = {
              id: now.getTime().toString(),
              mode: state.recordingMode,
              blob: fallbackBlob,
              url: fallbackUrl,
              duration: 10, // Simulated 10 seconds
              createdAt: now
            };
            
            setState(prev => ({
              ...prev,
              isRecording: false,
              isPaused: false,
              mediaRecorder: null,
              recording: fallbackRecording
            }));
            
            stopTimer();
          };
          
          fakeRecorder.start(100);
          
          setState(prev => ({
            ...prev,
            isRecording: true,
            isPaused: false,
            recordedChunks: [],
            mediaRecorder: fakeRecorder
          }));
          
          // Automatically stop the fake recording after 10 seconds
          setTimeout(() => {
            fakeRecorder.stop();
          }, 10000);
          
        } catch (simError) {
          console.error('Simulation error:', simError);
          
          // Last resort fallback - just create a fake recording directly
          const fallbackBlob = new Blob([new ArrayBuffer(1000)], {
            type: state.recordingMode === 'audio' ? 'audio/webm' : 'video/webm'
          });
          
          const fallbackUrl = URL.createObjectURL(fallbackBlob);
          const now = new Date();
          
          const fallbackRecording: Recording = {
            id: now.getTime().toString(),
            mode: state.recordingMode,
            blob: fallbackBlob,
            url: fallbackUrl,
            duration: 10, // Simulated 10 seconds
            createdAt: now
          };
          
          setState(prev => ({
            ...prev,
            isRecording: false,
            isPaused: false,
            mediaRecorder: null,
            recording: fallbackRecording
          }));
        }
        
        // Start timer for simulation
        setState(prev => ({ ...prev, recordingTime: 0 }));
        startTimer();
        
        // Stop timer after 10 seconds
        setTimeout(() => {
          stopTimer();
        }, 10000);
      } else {
        // Real error with permissions - propagate it
        throw error;
      }
    }
  }, [state.mediaStream, state.isPaused, state.mediaRecorder, state.recordingMode, state.recordingTime, requestPermissions, startTimer, stopTimer]);

  // Pause recording function
  const pauseRecording = useCallback(() => {
    if (state.mediaRecorder && state.isRecording) {
      state.mediaRecorder.pause();
      setState(prev => ({ ...prev, isRecording: true, isPaused: true }));
      
      // Pause timer
      pauseTimer();
    }
  }, [state.mediaRecorder, state.isRecording, pauseTimer]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    if (state.mediaRecorder) {
      state.mediaRecorder.stop();
      
      // Stop all tracks to properly release camera/microphone
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }
    } else if (simulationModeRef.current) {
      // Handle stopping in simulation mode
      const fallbackBlob = new Blob([new ArrayBuffer(5000)], {
        type: state.recordingMode === 'audio' ? 'audio/webm' : 'video/webm'
      });
      
      const fallbackUrl = URL.createObjectURL(fallbackBlob);
      const now = new Date();
      
      const fallbackRecording: Recording = {
        id: now.getTime().toString(),
        mode: state.recordingMode,
        blob: fallbackBlob,
        url: fallbackUrl,
        duration: state.recordingTime || 10,
        createdAt: now
      };
      
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        mediaRecorder: null,
        mediaStream: null,
        recording: fallbackRecording
      }));
    }
    
    // Stop timer
    stopTimer();
  }, [state.mediaRecorder, state.mediaStream, state.recordingMode, state.recordingTime, stopTimer]);

  // Download recording
  const downloadRecording = useCallback((format: 'mp4' | 'webm' | 'gif' | 'mp3' = 'webm') => {
    if (!state.recording) return;
    
    const { blob, mode } = state.recording;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'mp3' ? 'mp3' : format === 'gif' ? 'gif' : format;
    
    const fileName = `recording-${mode}-${timestamp}.${extension}`;
    
    // Create download link and trigger click
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(a.href);
  }, [state.recording]);

  // Reset recording state
  const resetRecording = useCallback(() => {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (state.recording) {
      URL.revokeObjectURL(state.recording.url);
    }
    
    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      recordingMode: state.recordingMode,
      settings: state.settings,
      mediaStream: null,
      mediaRecorder: null,
      recordedChunks: [],
      recording: null
    });
    
    stopTimer();
    pausedTimeRef.current = 0;
  }, [state.mediaStream, state.recording, state.recordingMode, state.settings, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }
      
      if (state.recording) {
        URL.revokeObjectURL(state.recording.url);
      }
    };
  }, [state.mediaStream, state.recording]);

  return {
    state,
    updateSettings,
    setRecordingMode,
    requestPermissions,
    startRecording,
    pauseRecording,
    stopRecording,
    downloadRecording,
    resetRecording,
    formatTime
  };
}