/**
 * WebRTC.js - Advanced Implementation
 * Robust WebRTC for Audio/Video Calls with Debugging
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
        this.debugMode = true;
        this.iceRestartAttempts = 0;
        this.maxIceRestarts = 2;

        // Enhanced media constraints with fallback options
        this.mediaConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: this.call.type === 'video' ? {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 30, min: 15 },
                facingMode: 'user'
            } : false
        };

        this.debug('WebRTCCall initialized', {
            callId: call.id,
            type: call.type,
            isCaller: isCaller
        });
    }

    // Debugging utility
      sendDebugToServer(...args) {
        if (!this.debugMode || !window.userId) return;

        const payload = {
            context: 'webrtc',
            message: args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' '),
            timestamp: new Date().toISOString(),
            user_id: window.userId,
            conversation_id: window.conversationId
        };

        if (navigator.onLine) {
            axios.post('/debug-log', payload)
                .catch(error => console.log('Debug log failed:' + error));
        } else {
            console.warn('Debug log skipped - offline');
        }
    }

    debug(...args) {
        if (this.debugMode) {
            console.log('[WebRTC]', ...args);
            this.sendDebugToServer(...args);
        }
    }



    /**
     * Main call initialization
     */
    async startNew1() {
        try {
            this.debug('Starting call setup');

            await this._setupMediaStream();
            this._createPeerConnection();
            await this._setupDataChannels();

            if (this.isCaller) {
                await this._createOffer();
            }

            this._updateUI();
            this._setupEventListeners();

            this.debug('Call setup complete');
        } catch (error) {
            this.debug('Call initialization failed:', error);
            this._handleFailure(error);
        }
    }

     async start() {
        try {
             this.debug('Starting call setup');

             console.log(this.cameraAvailable + ' ' + this.call.type);

            await this._setupMediaStream();

            // If video call but no camera available
            if (this.call.type === 'video' && !this.cameraAvailable) {
                this._sendSystemMessage('Video unavailable - continuing with audio only');
                // Update call type for negotiation
                this.call.type = 'audio';
                this.debug('Video unavailable - continuing with audio only');
            }

            this._createPeerConnection();
            await this._setupDataChannels();

            if (this.isCaller) {
                await this._createOffer();
            }

            this._updateUI();

            this._setupEventListeners();

            this.debug('Call setup complete');
        } catch (error) {
            console.error('Call initialization failed:', error);
            this._handleFailure(error);
        }
    }

    /**
     * Media Stream Setup with Robust Error Handling
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

            this.debug('Media stream acquired successfully');
        } catch (error) {
            this.debug('Media setup failed:', error);
            throw new Error('Could not access media devices: ' + error.message);
        }
    }

    async _getUserMediaWithFallbackNew() {
        const constraintsList = [
            this.mediaConstraints,
            { audio: true, video: this.call.type === 'video' },
            { audio: true }
        ];

        for (const constraints of constraintsList) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                this.debug('Got media with constraints:', constraints);

                // If we had to fallback to audio-only for video call
                if (this.call.type === 'video' && !constraints.video) {
                    this.videoEnabled = false;
                    this._sendSystemMessage('Video unavailable - continuing with audio only');
                }

                return stream;
            } catch (error) {
                this.debug('Media request failed with constraints:', constraints, error);
                if (constraints === constraintsList[constraintsList.length - 1]) {
                    throw error; // Throw if all options failed
                }
            }
        }
    }

    async _getUserMediaWithFallback() {
        try {
            // Try primary constraints first
            const stream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);
            this.debug('Got media with primary constraints');
            return stream;
        } catch (primaryError) {
            this.debug('Primary media request failed:', primaryError);

            // Fallback to simpler constraints
            try {
                const fallbackConstraints = {
                    audio: true,
                    video: this.call.type === 'video'
                };
                const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                this.debug('Got media with fallback constraints');
                return stream;
            } catch (fallbackError) {
                this.debug('Fallback media request failed:', fallbackError);

                // Final fallback to audio-only if video was requested
                if (this.call.type === 'video') {
                    try {
                        this.debug('Attempting audio-only fallback');
                        this.videoEnabled = false;
                        return await navigator.mediaDevices.getUserMedia({ audio: true });
                    } catch (audioError) {
                        this.debug('Audio-only fallback failed:', audioError);
                        throw audioError;
                    }
                }
                throw fallbackError;
            }
        }
    }

    /**
     * Peer Connection Setup with ICE Restart Capability
     */
    _createPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
                // Production should include TURN servers
            ],
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };

        this.peerConnection = new RTCPeerConnection(configuration);
        this.debug('PeerConnection created');

        // Add local tracks
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
            this.debug('Added track:', track.kind);
        });

        // Setup event handlers
        this._setupPeerConnectionEvents();
    }

    _setupPeerConnectionEvents() {
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.debug('New ICE candidate:', event.candidate);
                this._sendSignal({
                    type: 'candidate',
                    candidate: event.candidate
                });
            } else {
                this.debug('ICE gathering complete');
            }
        };

        this.peerConnection.ontrack = (event) => {
            this.debug('Received remote track:', event.track.kind);
            this.remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.srcObject = this.remoteStream;
            }
            this._sendSystemMessage('Remote stream received');
        };

        this.peerConnection.onnegotiationneeded = async () => {
            this.debug('Negotiation needed');
            if (this.isCaller) {
                await this._createOffer();
            }
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            this.debug('ICE connection state changed:', state);

            if (state === 'failed' && this.iceRestartAttempts < this.maxIceRestarts) {
                this.debug('Attempting ICE restart');
                this.iceRestartAttempts++;
                this._restartIce();
            } else if (state === 'disconnected') {
                this._sendSystemMessage('Connection unstable');
            }
        };

        this.peerConnection.onsignalingstatechange = () => {
            this.debug('Signaling state changed:', this.peerConnection.signalingState);
        };

        this.peerConnection.onconnectionstatechange = () => {
            this.connectionState = this.peerConnection.connectionState;
            this.debug('Connection state changed:', this.connectionState);

            if (this.connectionState === 'failed') {
                this._handleFailure(new Error('Connection failed'));
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            this.debug('Data channel received');
            this._handleDataChannel(event.channel);
        };
    }

    async _restartIce() {
        try {
            const offer = await this.peerConnection.createOffer({ iceRestart: true });
            await this.peerConnection.setLocalDescription(offer);
            await this._sendSignal({ type: 'offer', sdp: offer.sdp });
            this.debug('ICE restart offer sent');
        } catch (error) {
            this.debug('ICE restart failed:', error);
        }
    }

    /**
     * Data Channel Management
     */
    async _setupDataChannels() {
        if (this.isCaller) {
            this.dataChannel = this.peerConnection.createDataChannel('messenger-data', {
                ordered: true,
                maxPacketLifeTime: 3000
            });
            this._setupDataChannelEvents();
            this.debug('Data channel created');
        }
    }

    _setupDataChannelEvents() {
        this.dataChannel.onopen = () => {
            this.debug('Data channel opened');
            this._sendSystemMessage('Data channel ready');
        };

        this.dataChannel.onclose = () => {
            this.debug('Data channel closed');
            this._sendSystemMessage('Data channel closed');
        };

        this.dataChannel.onmessage = (event) => {
            this.debug('Data channel message:', event.data);
            this._displayDataMessage(event.data);
        };

        this.dataChannel.onerror = (error) => {
            this.debug('Data channel error:', error);
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

            this.debug('Creating offer with options:', offerOptions);
            const offer = await this.peerConnection.createOffer(offerOptions);
            await this.peerConnection.setLocalDescription(offer);
            await this._sendSignal({ type: 'offer', sdp: offer.sdp });
            this.debug('Offer created and sent');
        } catch (error) {
            console.log('Offer creation failed:' + error);
            this.debug('Offer creation failed:', error);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.debug(`Retrying offer creation (attempt ${this.retryCount})`);
                setTimeout(() => this._createOffer(), 1000 * this.retryCount);
            } else {
                throw error;
            }
        }
    }

    async handleSignal(signal) {
        this.debug('Received signal:', signal.type);

        try {
            if (!this.peerConnection) {
                this.debug('Signal received before peer connection initialized - queuing');
                this.pendingCandidates.push(signal);
                return;
            }

            switch (signal.type) {
                case 'offer':
                    // Add retry logic for offer processing
                    await this._retryOperation(() => this._handleOffer(signal), 3, 1000);
                    break;
                case 'answer':
                    await this._handleAnswer(signal);
                    break;
                case 'candidate':
                    await this._handleICECandidateSignal(signal);
                    break;
                default:
                    this.debug('Unknown signal type:', signal.type);
            }
        } catch (error) {
            this.debug('Signal handling failed:', error);
            this._handleFailure(error);
        }
    }

    async _retryOperation(operation, maxRetries, delayMs) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        throw lastError;
    }

    async _handleOffer(offer) {
        this.debug('Processing offer');
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
        );

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        await this._sendSignal({ type: 'answer', sdp: answer.sdp });

        this._processPendingCandidates();
        this.debug('Offer processed and answer sent');
    }

    async _handleOffer(offer) {
        try {
            this.debug('Processing offer');

            // Filter out problematic SDP lines
            if (offer.sdp) {
                offer.sdp = offer.sdp.split('\n')
                    .filter(line => !line.startsWith('a=max-message-size:'))
                    .join('\n');
            }

            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Also filter answer SDP if needed
            if (answer.sdp) {
                answer.sdp = answer.sdp.split('\n')
                    .filter(line => !line.startsWith('a=max-message-size:'))
                    .join('\n');
            }

            await this._sendSignal({ type: 'answer', sdp: answer.sdp });
            this._processPendingCandidates();
            this.debug('Offer processed and answer sent');
        } catch (error) {
            this.debug('Offer processing failed:', error);
            throw error;
        }
    }

    async _handleICECandidateSignal(candidateSignal) {
        try {
            if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidateSignal.candidate)
                );
                this.debug('ICE candidate added');
            } else {
                this.debug('Queueing ICE candidate - no remote description yet');
                this.pendingCandidates.push(candidateSignal.candidate);
            }
        } catch (error) {
            this.debug('Failed to add ICE candidate:', error);
        }
    }

    async _processPendingCandidates() {
        while (this.pendingCandidates.length > 0) {
            const candidate = this.pendingCandidates.shift();
            try {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
                this.debug('Processed queued ICE candidate');
            } catch (error) {
                this.debug('Failed to add queued ICE candidate:', error);
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
        this.debug('Audio toggled:', this.audioEnabled);
        return this.audioEnabled;
    }

    toggleVideo() {
        if (this.call.type !== 'video') {
            this._sendSystemMessage('This is not a video call');
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
        this.debug('Video toggled:', this.videoEnabled);
        return this.videoEnabled;
    }

    /**
     * Call Lifecycle Management
     */
    end() {
        if (this.connectionState === 'closed') return;

        this.debug('Ending call and cleaning up resources');
        this.connectionState = 'closed';

        // Clean up data channel
        if (this.dataChannel) {
            try {
                this.dataChannel.close();
            } catch (e) {
                this.debug('Error closing data channel:', e);
            }
        }

        // Clean up peer connection
        if (this.peerConnection) {
            try {
                this.peerConnection.close();
            } catch (e) {
                this.debug('Error closing peer connection:', e);
            }
        }

        // Stop media tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    this.debug('Error stopping track:', e);
                }
            });
        }

        // Clear video elements
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        if (localVideo) {
            localVideo.srcObject = null;
            localVideo.style.display = 'none';
        }
        if (remoteVideo) {
            remoteVideo.srcObject = null;
            remoteVideo.style.display = 'none';
        }

        this._sendSystemMessage('Call ended');
    }

    /**
     * UI Management
     */
    _updateUI() {
        const toggleAudioBtn = document.getElementById('toggleAudioBtn');
        const toggleVideoBtn = document.getElementById('toggleVideoBtn');

        if (toggleAudioBtn) {
            toggleAudioBtn.innerHTML = this.audioEnabled ?
                '<i class="fas fa-microphone"></i>' :
                '<i class="fas fa-microphone-slash"></i>';
        }

        if (toggleVideoBtn) {
            toggleVideoBtn.innerHTML = this.videoEnabled ?
                '<i class="fas fa-video"></i>' :
                '<i class="fas fa-video-slash"></i>';
            toggleVideoBtn.style.display = this.call.type === 'video' ? 'block' : 'none';
        }

        // Update video container based on call type
        const videoContainer = document.querySelector('.video-container');
        if (videoContainer) {
            if (this.call.type === 'audio') {
                videoContainer.style.display = 'none';
                document.getElementById('remoteVideo').style.display = 'none';
                document.getElementById('localVideo').style.display = 'none';
            } else {
                videoContainer.style.display = 'block';
                document.getElementById('remoteVideo').style.display = 'block';
                document.getElementById('localVideo').style.display = 'block';
            }
        }
    }

    _setupEventListeners() {
        const callModalThis = new bootstrap.Modal(document.getElementById('callModal'));
        document.getElementById('endCallBtn').onclick = () => {
            this.debug('User ended call');
            callModalThis.hide();
            endCall(this.call.id);
        };

        document.getElementById('toggleAudioBtn').onclick = () => {
            this.toggleAudio();
        };

        document.getElementById('toggleVideoBtn').onclick = () => {
            this.toggleVideo();
        };

          document.querySelector('.debug-toggle').addEventListener('click', () => {
            this.debugMode = !this.debugMode;
            this.showAlert(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
    });
    }

    _sendSystemMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            const msg = JSON.stringify({
                type: 'system',
                message: message,
                timestamp: new Date().toISOString()
            });
            try {
                this.dataChannel.send(msg);
                this.debug('System message sent:', message);
            } catch (e) {
                this.debug('Failed to send system message:', e);
            }
        }
    }

    _displayDataMessage(data) {
        try {
            const message = JSON.parse(data);
            if (message.type === 'system') {
                this.debug('System message received:', message.message);
                // Display in your chat UI
                console.log(message.message);

            }
        } catch (e) {
            this.debug('Raw data message:', data);
        }
    }

    async _sendSignal(signal) {
        try {
            this.debug('Sending signal:', signal.type);

            await axios.post('/broadcast-signal', {
                conversation_id: this.call.conversation.id,
                signal: signal,
                target_user_id: this.isCaller ? this.call.callee_id : this.call.caller_id,
                call_id: this.call.id
            });
        } catch (error) {
            this.debug('Failed to send signal:', error);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.debug(`Retrying signal send (attempt ${this.retryCount})`);
                setTimeout(() => this._sendSignal(signal), 1000 * this.retryCount);
            } else {
                throw error;
            }
        }
    }

    _handleFailure(error) {
        let userMessage = 'Call failed';

        if (error.message.includes('permission')) {
            userMessage = 'Please enable microphone/camera permissions';
        } else if (error.message.includes('not found')) {
            userMessage = 'Microphone/camera not found';
        } else if (error.message.includes('Could not start video source')) {
            userMessage = 'Camera is already in use by another application';
        }

        this.debug('Call failure:', error);
        console.log('Call failure:', error);
        showAlert(userMessage);
        this.end();
        //hideCallModal();

        endCall(this.call.id);
    }
}

/**
 * Initialize a new call with proper UI setup
 */
function initializeCall(call, isCaller) {
    // Close any existing call
    if (window.currentCall) {
        window.currentCall.end();
    }

    // Show call modal with appropriate title
    const callModal = new bootstrap.Modal(document.getElementById('callModal'));
    const otherUsers = call.conversation.users.filter(u => u.id !== window.userId);
    document.getElementById('callModalTitle').textContent =
        `${call.type} call with ${otherUsers.map(u => u.name).join(', ')}`;
    callModal.show();

    // Initialize WebRTC
    window.currentCall = new WebRTCCall(call, isCaller);
    window.currentCall.start();

    // Setup debug toggle
    document.getElementById('debugToggle')?.addEventListener('click', () => {
        window.currentCall.debugMode = !window.currentCall.debugMode;
        showAlert(`Debug mode ${window.currentCall.debugMode ? 'enabled' : 'disabled'}`);
    });
}

/**
 * End the current call properly
 */
function endCall(callId) {
    if (window.currentCall) {
        window.currentCall.end();
        window.currentCall = null;
    }

    axios.post(`/calls/${callId}/end`)
        .then(() => {
            window.currentCall = null;
            const callModal = new bootstrap.Modal(document.getElementById('callModal'));
            callModal.hide();
            console.log('Call ended webrt file');
            console.log('Call ended successfully');
        })
        .catch(error => {
            console.log('Failed to end call on server:' + error);
        });
}

// Handle incoming calls properly
function handleIncomingCall(call) {
    if (call.caller_id === userId) return;

    const modal = new bootstrap.Modal(document.getElementById('incomingCallModal'));
    document.getElementById('incomingCallType').textContent =
        `Incoming ${call.type} call from ${call.caller?.name || 'Unknown'}`;

    // Clear previous handlers
    const answerBtn = document.getElementById('answerCallBtn');
    const rejectBtn = document.getElementById('rejectCallBtn');
    answerBtn.onclick = null;
    rejectBtn.onclick = null;

    answerBtn.onclick = async function () {
        modal.hide();
        try {
            const response = await axios.post(`/calls/${call.id}/answer`);
            initializeCall(response.data, false);
        } catch (error) {
            console.log('Failed to answer call:' + error);
            showAlert('Failed to answer call');
        }
    };

    rejectBtn.onclick = function () {
        modal.hide();
        endCall(call.id);
    };

    modal.show();
}

// Debugging utility
function showDebugInfo(message) {
    const debugConsole = document.getElementById('debugConsole') || createDebugConsole();
    debugConsole.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
    debugConsole.scrollTop = debugConsole.scrollHeight;
}

function createDebugConsole() {
    const consoleDiv = document.createElement('div');
    consoleDiv.id = 'debugConsole';
    consoleDiv.style.position = 'fixed';
    consoleDiv.style.bottom = '0';
    consoleDiv.style.right = '0';
    consoleDiv.style.width = '300px';
    consoleDiv.style.height = '200px';
    consoleDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    consoleDiv.style.color = 'white';
    consoleDiv.style.overflow = 'auto';
    consoleDiv.style.padding = '10px';
    consoleDiv.style.zIndex = '10000';
    document.body.appendChild(consoleDiv);
    return consoleDiv;
}

function showAlert(message) {
        const alertsContainer = document.getElementById('alerts-container') || document.body;
        const alertElement = document.createElement('div');
        alertElement.className = 'alert alert-warning alert-dismissible fade show';
        alertElement.role = 'alert';
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertsContainer.prepend(alertElement);

        setTimeout(() => {
            alertElement.classList.remove('show');
            setTimeout(() => alertElement.remove(), 150);
        }, 5000);
    }
