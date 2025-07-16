// resources/js/webrtc.js
function initializeCall(call, isCaller) {
    const callModal = new bootstrap.Modal(document.getElementById('callModal'));
    document.getElementById('callModalTitle').textContent =
        `${call.type} call with ${call.conversation.users.filter(u => u.id !== userId).map(u => u.name).join(', ')}`;

    callModal.show();

    // Initialize WebRTC
    window.currentCall = new WebRTCCall(call, isCaller);
    window.currentCall.start();

    // Set up call controls
    document.getElementById('endCallBtn').onclick = function() {
        endCall(call.id);
        callModal.hide();
    };

    document.getElementById('toggleAudioBtn').onclick = function() {
        window.currentCall.toggleAudio();
        this.innerHTML = window.currentCall.audioEnabled ?
            '<i class="fas fa-microphone"></i> Mute' :
            '<i class="fas fa-microphone-slash"></i> Unmute';
    };

    document.getElementById('toggleVideoBtn').onclick = function() {
        window.currentCall.toggleVideo();
        this.innerHTML = window.currentCall.videoEnabled ?
            '<i class="fas fa-video"></i> Video Off' :
            '<i class="fas fa-video-slash"></i> Video On';
    };
}

 function endCall(callId) {
        axios.post(`/calls/${callId}/end`)
            .then(response => {
                console.log(response.data);
            })
            .catch(error => {
                 console.log(error);
            });
    }

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
    }

    async start() {
        try {
            // Get local media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: this.call.type === 'video'
            });

            document.getElementById('localVideo').srcObject = this.localStream;

            if (!this.videoEnabled) {
                document.getElementById('localVideo').style.display = 'none';
            }

            // Create peer connection
            this.createPeerConnection();

            // Add local stream to connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Create data channel if caller
            if (this.isCaller) {
                this.dataChannel = this.peerConnection.createDataChannel('chat');
                this.setupDataChannel();

                // Create offer
                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);

                // Here you would send the offer to the other peer via your signaling server (Laravel)
                // For simplicity, we're using Laravel's broadcast system
                // In a real app, you'd use WebSockets or another signaling method
                this.sendSignal({
                    type: 'offer',
                    sdp: offer.sdp
                });
            }
        } catch (error) {
            console.error('Error starting call:', error);
            endCall(this.call.id);
        }
    }

    createPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
                // Add your TURN servers here if needed
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Set up event handlers
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'candidate',
                    candidate: event.candidate
                });
            }
        };

        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            document.getElementById('remoteVideo').srcObject = this.remoteStream;
        };

        if (!this.isCaller) {
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannel();
            };
        }
    }

    setupDataChannel() {
        this.dataChannel.onmessage = (event) => {
            console.log('Data channel message:', event.data);
            // Handle chat messages or other data
        };

        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
        };
    }

    async handleSignal(signal) {
        try {
            if (signal.type === 'offer') {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
                    type: 'offer',
                    sdp: signal.sdp
                }));

                const answer = await this.peerConnection.createAnswer();
                console.log('answer', answer);
                await this.peerConnection.setLocalDescription(answer);

                this.sendSignal({
                    type: 'answer',
                    sdp: answer.sdp
                });
            } else if (signal.type === 'answer') {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
                    type: 'answer',
                    sdp: signal.sdp
                }));
            } else if (signal.type === 'candidate') {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
            console.log('signal', signal);
        } catch (error) {
            console.log('Error handling signal:', error);
        }
    }

    sendSignal(signal) {
        // In a real app, you'd send this via WebSocket to the other peer
        // For this example, we'll broadcast it to all users in the conversation
        // (not ideal for production)
        axios.post('/broadcast-signal', {
            conversation_id: this.call.conversation.id,
            signal: signal,
            target_user_id: this.isCaller ? null : this.call.caller_id
        }).catch(error => {
            console.log('Error sending signal:', error);
        });
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = this.audioEnabled;
        });
    }

    toggleVideo() {
        this.videoEnabled = !this.videoEnabled;
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = this.videoEnabled;
        });
        document.getElementById('localVideo').style.display = this.videoEnabled ? 'block' : 'none';
    }

    end() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
    }
}
