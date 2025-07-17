/**
 * Robust WebRTC Implementation for Laravel Messenger
 * Handles video/audio calls with complete error recovery
 */

class WebRTCCall {
    constructor(call, isCaller) {
        this.call = call;
        this.isCaller = isCaller;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.audioEnabled = true;
        this.videoEnabled = call.type === 'video';
        this.dataChannel = null;
        this.connectionState = 'new';
        this.pendingCandidates = [];
        this.retryCount = 0;
        this.maxRetries = 3;

        // Media constraints with fallback options
        this.mediaConstraints = {
            audio: true,
            video: this.call.type === 'video' ? {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 30, min: 15 },
                facingMode: 'user'
            } : false
        };
    }

    /**
     * Main call initialization
     */
    async start() {
        try {
            await this._setupMediaStream();
            this._createPeerConnection();
            await this._setupDataChannels();

            if (this.isCaller) {
                await this._createOffer();
            }

            this._updateUI();
        } catch (error) {
            console.error('Call initialization failed:', error);
            this._handleFailure(error);
        }
    }

    /**
     * Advanced media acquisition with multiple fallbacks
     */
    async _setupMediaStream() {
        try {
            this.localStream = await this._getUserMediaWithFallback();

            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
                localVideo.muted = true;
                localVideo.style.display = this.videoEnabled ? 'block' : 'none';
            }
        } catch (error) {
            console.error('All media acquisition attempts failed:', error);
            throw new Error('Could not access any media devices');
        }
    }

    async _getUserMediaWithFallback() {
        // Try primary constraints first
        try {
            return await navigator.mediaDevices.getUserMedia(this.mediaConstraints);
        } catch (firstError) {
            console.warn('Primary media request failed:', firstError);

            // 1st fallback: Try relaxed video constraints
            try {
                const relaxedConstraints = {
                    audio: true,
                    video: this.call.type === 'video' ? {
                        width: { min: 640 },
                        height: { min: 480 },
                        frameRate: { min: 15 },
                        facingMode: { exact: 'environment' }
                    } : false
                };
                const stream = await navigator.mediaDevices.getUserMedia(relaxedConstraints);
                return stream;
            } catch (secondError) {
                console.warn('Relaxed constraints failed:', secondError);

                // 2nd fallback: Try any video device
                try {
                    const anyVideoConstraints = {
                        audio: true,
                        video: this.call.type === 'video' ? true : false
                    };
                    const stream = await navigator.mediaDevices.getUserMedia(anyVideoConstraints);
                    return stream;
                } catch (thirdError) {
                    console.warn('Any video device failed:', thirdError);

                    // Final fallback to audio-only if this was a video call
                    if (this.call.type === 'video') {
                        try {
                            console.log('Attempting audio-only fallback');
                            this.videoEnabled = false;
                            return await navigator.mediaDevices.getUserMedia({ audio: true });
                        } catch (audioError) {
                            console.error('Audio fallback failed:', audioError);
                            throw audioError;
                        }
                    }
                    throw thirdError;
                }
            }
        }
    }

    /**
     * Peer Connection Setup
     */
    _createPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
                // Add TURN servers here for production:
                // {
                //   urls: 'turn:your-turn-server.com',
                //   username: 'username',
                //   credential: 'password'
                // }
            ],
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Event handlers
        this.peerConnection.onicecandidate = (event) => this._handleICECandidate(event);
        this.peerConnection.ontrack = (event) => this._handleRemoteTrack(event);
        this.peerConnection.onnegotiationneeded = () => this._handleNegotiationNeeded();
        this.peerConnection.oniceconnectionstatechange = () => this._handleICEConnectionStateChange();
        this.peerConnection.onsignalingstatechange = () => this._handleSignalingStateChange();
        this.peerConnection.onconnectionstatechange = () => this._handleConnectionStateChange();
        this.peerConnection.ondatachannel = (event) => this._handleDataChannel(event.channel);
    }

    /**
     * Data Channel Management
     */
    async _setupDataChannels() {
        if (this.isCaller) {
            this.dataChannel = this.peerConnection.createDataChannel('messenger-chat', {
                ordered: true,
                maxRetransmits: 3
            });
            this._setupDataChannelEvents();
        }
    }

    _setupDataChannelEvents() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this._sendSystemMessage('Data channel ready');
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this._sendSystemMessage('Data channel closed');
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Data message:', event.data);
            this._displayDataMessage(event.data);
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    }

    /**
     * Signaling Methods
     */
    async _createOffer() {
        try {
            const offerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: this.call.type === 'video',
                iceRestart: false,
                voiceActivityDetection: false
            };

            const offer = await this.peerConnection.createOffer(offerOptions);
            await this.peerConnection.setLocalDescription(offer);
            await this._sendSignal({ type: 'offer', sdp: offer.sdp });
        } catch (error) {
            console.error('Offer creation failed:', error);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying offer creation (attempt ${this.retryCount})`);
                setTimeout(() => this._createOffer(), 1000 * this.retryCount);
            } else {
                throw error;
            }
        }
    }

    async handleSignal(signal) {
        try {
            if (!this.peerConnection) {
                console.warn('Signal received before peer connection initialized');
                this.pendingCandidates.push(signal);
                return;
            }

            switch (signal.type) {
                case 'offer':
                    await this._handleOffer(signal);
                    break;
                case 'answer':
                    await this._handleAnswer(signal);
                    break;
                case 'candidate':
                    await this._handleICECandidateSignal(signal);
                    break;
                default:
                    console.warn('Unknown signal type:', signal.type);
            }
        } catch (error) {
            console.error('Signal handling failed:', error);
        }
    }

    async _handleOffer(offer) {
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
        );

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        await this._sendSignal({ type: 'answer', sdp: answer.sdp });

        this._processPendingCandidates();
    }

    async _handleAnswer(answer) {
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
        );
        this._processPendingCandidates();
    }

    async _handleICECandidateSignal(candidateSignal) {
        try {
            if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidateSignal.candidate)
                );
            } else {
                console.log('Queueing ICE candidate');
                this.pendingCandidates.push(candidateSignal.candidate);
            }
        } catch (error) {
            console.warn('Failed to add ICE candidate:', error);
        }
    }

    async _processPendingCandidates() {
        while (this.pendingCandidates.length > 0) {
            const candidate = this.pendingCandidates.shift();
            try {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (error) {
                console.warn('Failed to add queued ICE candidate:', error);
            }
        }
    }

    /**
     * Media Control Methods
     */
    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = this.audioEnabled;
        });
        this._sendSystemMessage(this.audioEnabled ? 'Microphone unmuted' : 'Microphone muted');
        this._updateUI();
        return this.audioEnabled;
    }

    toggleVideo() {
        if (!this.mediaConstraints.video) {
            this._sendSystemMessage('Video is not available');
            return false;
        }

        this.videoEnabled = !this.videoEnabled;
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = this.videoEnabled;
        });

        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.style.display = this.videoEnabled ? 'block' : 'none';
        }

        this._sendSystemMessage(this.videoEnabled ? 'Video enabled' : 'Video disabled');
        this._updateUI();
        return this.videoEnabled;
    }

    /**
     * Call Lifecycle Management
     */
    end() {
        if (this.connectionState === 'closed') return;

        this.connectionState = 'closed';
        console.log('Ending call and cleaning up resources');

        // Clean up data channel
        if (this.dataChannel) {
            this.dataChannel.close();
        }

        // Clean up peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        // Stop media tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        // Clear video elements
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;

        this._sendSystemMessage('Call ended');
    }

    /**
     * Event Handlers
     */
    _handleICECandidate(event) {
        if (event.candidate) {
            this._sendSignal({
                type: 'candidate',
                candidate: event.candidate
            });
        }
    }

    _handleRemoteTrack(event) {
        this.remoteStream = event.streams[0];
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = this.remoteStream;
        }
        this._sendSystemMessage('Remote stream received');
    }

    _handleDataChannel(channel) {
        this.dataChannel = channel;
        this._setupDataChannelEvents();
    }

    _handleNegotiationNeeded() {
        console.log('Renegotiation needed');
        if (this.isCaller && this.connectionState === 'connected') {
            this._createOffer();
        }
    }

    _handleICEConnectionStateChange() {
        const state = this.peerConnection.iceConnectionState;
        console.log('ICE connection state:', state);

        if (state === 'failed') {
            this._handleFailure(new Error('ICE connection failed'));
        } else if (state === 'disconnected') {
            this._sendSystemMessage('Connection unstable');
        }
    }

    _handleSignalingStateChange() {
        console.log('Signaling state:', this.peerConnection.signalingState);
    }

    _handleConnectionStateChange() {
        this.connectionState = this.peerConnection.connectionState;
        console.log('Connection state:', this.connectionState);

        if (this.connectionState === 'failed') {
            this._handleFailure(new Error('Connection failed'));
        }
    }

    _handleFailure(error) {
        console.error('Call failure:', error);
        this._sendSystemMessage(`Error: ${error.message}`);
        this.end();
        endCall(this.call.id);
    }

    /**
     * UI Management
     */
    _updateUI() {
        const toggleAudioBtn = document.getElementById('toggleAudioBtn');
        const toggleVideoBtn = document.getElementById('toggleVideoBtn');

        if (toggleAudioBtn) {
            toggleAudioBtn.innerHTML = this.audioEnabled ?
                '<i class="fas fa-microphone"></i> Mute' :
                '<i class="fas fa-microphone-slash"></i> Unmute';
        }

        if (toggleVideoBtn) {
            toggleVideoBtn.innerHTML = this.videoEnabled ?
                '<i class="fas fa-video"></i> Video Off' :
                '<i class="fas fa-video-slash"></i> Video On';
            toggleVideoBtn.disabled = !this.mediaConstraints.video;
        }
    }

    _sendSystemMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'system',
                message: message,
                timestamp: new Date().toISOString()
            }));
        }
    }

    _displayDataMessage(data) {
        try {
            const message = JSON.parse(data);
            if (message.type === 'system') {
                console.log('System message:', message.message);
                // Display in your chat UI
            }
        } catch (e) {
            console.log('Raw data message:', data);
        }
    }

    async _sendSignal(signal) {
        try {
            await axios.post('/broadcast-signal', {
                conversation_id: this.call.conversation.id,
                signal: signal,
                target_user_id: this.isCaller ? null : this.call.caller_id,
                call_id: this.call.id
            });
        } catch (error) {
            console.error('Failed to send signal:', error);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying signal send (attempt ${this.retryCount})`);
                setTimeout(() => this._sendSignal(signal), 1000 * this.retryCount);
            } else {
                throw error;
            }
        }
    }
}

/**
 * Initialize a new call
 */
function initializeCall(call, isCaller) {
    // Close any existing call
    if (window.currentCall) {
        window.currentCall.end();
    }

    // Show call modal
    const callModal = new bootstrap.Modal(document.getElementById('callModal'));
    document.getElementById('callModalTitle').textContent =
        `${call.type} call with ${call.conversation.users.filter(u => u.id !== window.userId).map(u => u.name).join(', ')}`;
    callModal.show();

    // Setup UI controls
    document.getElementById('endCallBtn').onclick = () => {
        endCall(call.id);
        callModal.hide();
    };

    document.getElementById('toggleAudioBtn').onclick = () => {
        if (window.currentCall) {
            window.currentCall.toggleAudio();
        }
    };

    document.getElementById('toggleVideoBtn').onclick = () => {
        if (window.currentCall) {
            window.currentCall.toggleVideo();
        }
    };

    // Initialize WebRTC
    window.currentCall = new WebRTCCall(call, isCaller);
    window.currentCall.start();
}

/**
 * End the current call
 */
function endCall(callId) {
    if (window.currentCall) {
        window.currentCall.end();
        window.currentCall = null;
    }

    axios.post(`/calls/${callId}/end`)
        .catch(error => {
            console.error('Failed to end call on server:', error);
        });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WebRTCCall,
        initializeCall,
        endCall
    };
}
