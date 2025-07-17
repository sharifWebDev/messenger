import './bootstrap';

import Echo from 'laravel-echo';

// import Pusher from 'pusher-js';
// window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});


// import Echo from 'laravel-echo';

// const EchoInstance = new Echo({
//     broadcaster: 'reverb',
//     key: import.meta.env.VITE_REVERB_APP_KEY || 'messenger-key',
//     wsHost: window.location.hostname,
//     wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
//     forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
//     enabledTransports: ['ws', 'wss'],
//     cluster: import.meta.env.VITE_REVERB_CLUSTER || 'mt1', // ✅ This line is crucial
//     authEndpoint: '/broadcasting/auth',
//     reverb: {
//         appId: import.meta.env.VITE_REVERB_APP_ID || 'messenger',
//         appKey: import.meta.env.VITE_REVERB_APP_KEY || 'messenger-key',
//     }
// });

// window.Echo = EchoInstance;

// WebRTC Call Class
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
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: this.call.type === 'video'
            });

            // Display local video
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
                if (!this.videoEnabled) {
                    localVideo.style.display = 'none';
                }
            }

            // Create peer connection
            this.createPeerConnection();

            // Add tracks to connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Create data channel if caller
            if (this.isCaller) {
                this.dataChannel = this.peerConnection.createDataChannel('chat');
                this.setupDataChannel();

                // Create and send offer
                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);

                this.sendSignal({
                    type: 'offer',
                    sdp: offer.sdp
                });
            }
        } catch (error) {
            console.error('Error starting call:', error);
            this.endCall();
        }
    }

    createPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
                // Add TURN servers here for production
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // ICE candidate handler
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'candidate',
                    candidate: event.candidate
                });
            }
        };

        // Track handler
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.srcObject = this.remoteStream;
            }
        };

        // Data channel handler for callee
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
        } catch (error) {
            console.error('Error handling signal:', error);
        }
    }

    sendSignal(signal) {
        axios.post('/broadcast-signal', {
            conversation_id: this.call.conversation_id,
            signal: signal,
            target_user_id: this.isCaller ? null : this.call.caller_id
        }).catch(error => {
            console.error('Error sending signal:', error);
        });
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = this.audioEnabled;
        });
        return this.audioEnabled;
    }

    toggleVideo() {
        this.videoEnabled = !this.videoEnabled;
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = this.videoEnabled;
        });
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.style.display = this.videoEnabled ? 'block' : 'none';
        }
        return this.videoEnabled;
    }

    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        axios.post(`/calls/${this.call.id}/end`).catch(error => {
            console.error('Error ending call:', error);
        });
    }
}

// // Initialize chat functionality
// document.addEventListener('DOMContentLoaded', function() {
//     // Message form handling
//     const messageForm = document.getElementById('send-message-form');
//     if (messageForm) {
//         messageForm.addEventListener('submit', function(e) {
//             e.preventDefault();
//             const formData = new FormData(this);

//             axios.post(this.action, formData)
//                 .then(response => {
//                     this.querySelector('input[name="body"]').value = '';
//                 })
//                 .catch(error => {
//                     console.error('Error sending message:', error);
//                 });
//         });
//     }

//     // Call button handlers
//     document.querySelectorAll('.start-call').forEach(button => {
//         button.addEventListener('click', function() {
//             const type = this.getAttribute('data-type');
//             const conversationId = this.getAttribute('data-conversation-id');

//             axios.post('/calls', {
//                 conversation_id: conversationId,
//                 type: type
//             }).then(response => {
//                 initializeCall(response.data, true);
//             }).catch(error => {
//                 console.error('Error starting call:', error);
//             });
//         });
//     });

//     // Initialize call modal
//     const callModal = document.getElementById('callModal');
//     if (callModal) {
//         const modal = new bootstrap.Modal(callModal);

//         document.getElementById('endCallBtn').addEventListener('click', function() {
//             if (window.currentCall) {
//                 window.currentCall.endCall();
//                 window.currentCall = null;
//             }
//             modal.hide();
//         });

//         document.getElementById('toggleAudioBtn').addEventListener('click', function() {
//             if (window.currentCall) {
//                 const enabled = window.currentCall.toggleAudio();
//                 this.innerHTML = enabled ?
//                     '<i class="fas fa-microphone"></i> Mute' :
//                     '<i class="fas fa-microphone-slash"></i> Unmute';
//             }
//         });

//         document.getElementById('toggleVideoBtn').addEventListener('click', function() {
//             if (window.currentCall) {
//                 const enabled = window.currentCall.toggleVideo();
//                 this.innerHTML = enabled ?
//                     '<i class="fas fa-video"></i> Video Off' :
//                     '<i class="fas fa-video-slash"></i> Video On';
//             }
//         });
//     }

//     // Handle incoming calls
//     window.Echo.private(`user.${window.userId}`)
//         .listen('CallSignal', (e) => {
//             if (window.currentCall && e.conversation_id === window.currentCall.call.conversation_id) {
//                 window.currentCall.handleSignal(e.signal);
//             }
//         });
// });

// // Initialize a call
// function initializeCall(callData, isCaller) {
//     window.currentCall = new WebRTCCall(callData, isCaller);
//     window.currentCall.start();

//     const callModal = new bootstrap.Modal(document.getElementById('callModal'));
//     document.getElementById('callModalTitle').textContent =
//         `${callData.type} call with ${callData.conversation.users.filter(u => u.id !== window.userId).map(u => u.name).join(', ')}`;
//     callModal.show();
// }
