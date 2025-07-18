// resources/js/chat.js
class WebRTCManager {
    constructor() {
        this.currentCall = null;
        this.debugMode = true;
        this.callTimer = null;
        this.callStartTime = null;
    }

    // Debug methods
    debug(...args) {
        if (this.debugMode) {
            console.log('[WebRTC]', ...args);
        }
    }

    // Timer methods
    updateCallDuration() {
        if (!this.callStartTime) return;

        const now = new Date();
        const elapsed = Math.floor((now - this.callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');

        const durationElement = document.getElementById('callDuration');
        if (durationElement) {
            durationElement.textContent = `${minutes}:${seconds}`;
        }
    }

    startCallTimer() {
        this.callStartTime = new Date();
        this.callTimer = setInterval(() => this.updateCallDuration(), 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        const durationElement = document.getElementById('callDuration');
        if (durationElement) {
            durationElement.textContent = '00:00';
        }
    }

    // Core methods
    async initialize() {
        this.setupEventListeners();
        await this.joinConversationChannel();
        this.setupPrivateChannel();
        this.setupDebugToggle();
    }

    setupEventListeners() {
        // Message form
        const messageForm = document.getElementById('send-message-form');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const messageInput = messageForm.querySelector('input[name="body"]');
                if (messageInput?.value.trim()) {
                    this.sendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
        }

        // Call buttons
        document.querySelectorAll('.start-audio-call, .start-video-call').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                this.startCall(type);
            });
        });
    }

    setupDebugToggle() {
        const debugToggle = document.querySelector('.toggle-debug');
        if (debugToggle) {
            debugToggle.addEventListener('click', () => {
                this.debugMode = !this.debugMode;
                const debugConsole = document.getElementById('debugConsole');
                if (debugConsole) {
                    debugConsole.style.display = this.debugMode ? 'block' : 'none';
                }
                this.showAlert(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
            });
        }
    }

    async joinConversationChannel() {
        if (typeof conversationId === 'undefined') return;

        window.conversationChannel = window.Echo.join(`conversation.${conversationId}`)
            .here(users => this.handlePresenceUpdate('here', users))
            .joining(user => this.handlePresenceUpdate('joining', user))
            .leaving(user => this.handlePresenceUpdate('leaving', user))
            .listen('MessageSent', e => this.addMessageToChat(e.message))
            .listen('CallStarted', e => this.handleIncomingCall(e.call))
            .listen('CallAnswered', e => this.handleCallAnswered(e.call))
            .listen('CallEnded', e => this.handleCallEnded(e.call));
    }

    setupPrivateChannel() {
        window.Echo.private(`user.${userId}`)
            .listen('CallSignal', data => {
                if (this.currentCall && data.call_id === this.currentCall.id) {
                    this.currentCall.handleSignal(data.signal);
                }
            });
    }


    async sendMessage(message) {
        try {
            const response = await axios.post('/messages', {
                conversation_id: conversationId,
                body: message
            });
            this.addMessageToChat(response.data);
        } catch (error) {
            this.debug('Message send failed:', error);
            this.showAlert('Failed to send message' + error);
        }
    }

    async startCall(type) {
        try {
            const cameraCheck = await this.checkCameraAvailability();
            if (type === 'video' && !cameraCheck.available) {
                const proceed = confirm(`${cameraCheck.reason} Continue with audio only?`);
                if (!proceed) return;
                type = 'audio';
            }

            const response = await axios.post('/calls', {
                conversation_id: conversationId,
                type: type
            });

            this.initializeCall(response.data, true);
        } catch (error) {
            this.debug('Call start failed:', error);
            this.showAlert('Failed to start call' + error);
        }
    }

    async answerCall(callId) {
        try {
            const response = await axios.post(`/calls/${callId}/answer`);
            this.initializeCall(response.data, false);
        } catch (error) {
            this.debug('Call answer failed:', error);
            this.showAlert('Failed to answer call' + error);
        }
    }

    async endCall(callId) {
        try {
            await axios.post(`/calls/${callId}/end`);
            if (this.currentCall) {
                this.currentCall.end();
                this.currentCall = null;
            }
        } catch (error) {
            this.debug('Call end failed:', error);
        }
    }

    initializeCall(callData, isCaller) {
        if (this.currentCall) {
            this.currentCall.end();
        }

        console.log('Call data:', callData);
        this.currentCall = new WebRTCCall(callData, isCaller);
        this.currentCall.start();

        // Show call modal
        const callModal = new bootstrap.Modal(document.getElementById('callModal'));
        document.getElementById('callModalTitle').textContent =
            `${callData.type} call with ${callData.conversation.users
                .filter(u => u.id !== userId)
                .map(u => u.name)
                .join(', ')}`;

        // Setup call controls
        document.getElementById('endCallBtn').onclick = () => this.endCall(callData.id);
        document.getElementById('toggleAudioBtn').onclick = () => this.currentCall.toggleAudio();
        document.getElementById('toggleVideoBtn').onclick = () => this.currentCall.toggleVideo();

        callModal.show();
    }

    handlePresenceUpdate(type, userOrUsers) {
        if (type === 'here') {
            this.debug('Users in conversation:', userOrUsers);
        } else {
            const user = userOrUsers;
            const message = `${user.name} ${type === 'joining' ? 'joined' : 'left'} the conversation`;
            this.showSystemMessage(message);
        }
    }

    handleIncomingCall(call) {
        if (call.caller_id === userId) return;

        const modal = new bootstrap.Modal(document.getElementById('incomingCallModal'));
        document.getElementById('incomingCallType').textContent =
            `${call.type} call from ${call.caller?.name || 'Unknown'}`;

        // Clear previous handlers
        const answerBtn = document.getElementById('answerCallBtn');
        const rejectBtn = document.getElementById('rejectCallBtn');
        answerBtn.onclick = null;
        rejectBtn.onclick = null;

        answerBtn.onclick = () => {
            modal.hide();
            this.answerCall(call.id);
        };

        rejectBtn.onclick = () => {
            modal.hide();
            this.endCall(call.id);
        };

        modal.show();
    }

    handleCallAnswered(call) {
        if (call.caller_id === userId && this.currentCall) {
            this.currentCall.handleRemoteAnswer();
        }
    }

    handleCallEnded(call) {
        const callModal = bootstrap.Modal.getInstance(document.getElementById('callModal'));
        if (callModal) {
            console.log('Call ended chat js');
            callModal.hide();
        }

        if (this.currentCall) {
            this.currentCall.end();
            this.currentCall = null;
        }

        this.showSystemMessage('Call ended');
    }

    addMessageToChat(message) {
        const messagesContainer = document.querySelector('.conversation-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.user_id === userId ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <strong>${message.user_name || 'Unknown'}</strong>
            <p>${message.body}</p>
            <small>${new Date(message.created_at).toLocaleTimeString()}</small>
        `;
        messagesContainer.prepend(messageElement);
        this.scrollToBottom();
    }

    showSystemMessage(message) {
        const messagesContainer = document.querySelector('.conversation-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <p class="text-muted small">${message}</p>
        `;
        messagesContainer.prepend(messageElement);
        this.scrollToBottom();
    }

    async checkCameraAvailability() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            if (videoDevices.length === 0) return { available: false, reason: 'No camera found' };

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return { available: true };
        } catch (error) {
            return {
                available: false,
                reason: error.name === 'NotAllowedError'
                    ? 'Camera access denied'
                    : 'Camera unavailable'
            };
        }
    }

    showAlert(message) {
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

    scrollToBottom() {
        const messagesContainer = document.querySelector('.conversation-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

}
 // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            window.rtcManager = new WebRTCManager();
            window.rtcManager.initialize();



        // Toggle debug console
        document.querySelector('.toggle-debug').addEventListener('click', function() {
            debugMode = !debugMode;
            const debugConsole = document.getElementById('debugConsole');
            debugConsole.style.display = debugMode ? 'block' : 'none';
        });
    });
