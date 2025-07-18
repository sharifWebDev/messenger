// resources/js/chat.js
document.addEventListener('DOMContentLoaded', async function() {

    const messageForm = document.getElementById('send-message-form');
    const messageInput = messageForm?.querySelector('input[name="body"]');
    const messagesContainer = document.querySelector('.conversation-messages');


    // Join conversation channel
    if (typeof conversationId !== 'undefined') {
        window.conversationChannel = window.Echo.join(`conversation.${conversationId}`)
            .here((users) => {
                console.log('Users in conversation:', users);
            })
            .joining((user) => {
                console.log('User joined:', user);
                showSystemMessage(`${user.name} joined the conversation`);
            })
            .leaving((user) => {
                console.log('User left:', user);
                showSystemMessage(`${user.name} left the conversation`);
            })
            .listen('MessageSent', (e) => {
                addMessageToChat(e.message);
            })
            .listen('CallStarted', (e) => {
                handleIncomingCall(e.call);
            })
            .listen('CallAnswered', (e) => {
                handleCallAnswered(e.call);
            })
            .listen('CallEnded', (e) => {
                handleCallEnded(e.call);
            });
    }

    // Send message
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!messageInput.value.trim()) return;

            axios.post('/messages', {
                conversation_id: conversationId,
                body: messageInput.value
            }).then(response => {
                messageInput.value = '';
                addMessageToChat(response.data);
            }).catch(error => {
                console.error('Message send failed:', error);
                showAlert('Failed to send message');
            });
        });
    }

    // Add message to chat
    function addMessageToChat(message) {
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.user_id === userId ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <strong>${message.user_name || message.user_id}</strong>
            <p>${message.body}</p>
            <small>${formatMessageTime(message.created_at)}</small>
        `;
        messagesContainer.prepend(messageElement);
        scrollToBottom();
    }

    function formatMessageTime(timestamp) {
        if (!timestamp) return 'Just now';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Initialize call buttons
    document.querySelectorAll('.start-audio-call, .start-video-call').forEach(button => {
        button.addEventListener('click', async function() {
            const type = this.getAttribute('data-type');
            await startCall(type);
        });
    });

    async function startCall(type) {
        try {
            // Check device capabilities before starting call
            const cameraCheck = await checkCameraAvailability();
            if (type === 'video' && !cameraCheck.available) {
                const proceed = confirm(`${cameraCheck.reason}. Continue with audio only?`);
                if (!proceed) return;
                type = 'audio';
            }

            const response = await axios.post('/calls', {
                conversation_id: conversationId,
                type: type
            });

            console.log('📞 Call started:', response.data);
            initializeCall(response.data, true);
        } catch (error) {
            console.error('Call start failed:', error);
            showAlert('Failed to start call');
        }
    }

    async function checkCameraAvailability() {
        try {
            // First check permissions
            const permissionStatus = await navigator.permissions.query({ name: 'camera' });
            if (permissionStatus.state === 'denied') {
                return {
                    available: false,
                    reason: 'Camera access denied. Please check browser permissions.'
                };
            }

            // Then enumerate devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput' && d.deviceId !== '');

            if (videoDevices.length === 0) {
                return {
                    available: false,
                    reason: 'No camera devices found'
                };
            }

            // Test actual access
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop());
                return { available: true };
            } catch (error) {
                return {
                    available: false,
                    reason: this._getFriendlyErrorMessage(error)
                };
            }
        } catch (error) {
            return {
                available: false,
                reason: this._getFriendlyErrorMessage(error)
            };
        }
    }

    function _getFriendlyErrorMessage(error) {
        switch(error.name) {
            case 'NotAllowedError':
                return 'Camera access denied. Please allow camera permissions.';
            case 'NotFoundError':
                return 'No camera found on this device.';
            case 'NotReadableError':
                return 'Camera is already in use by another application.';
            case 'OverconstrainedError':
                return 'Camera doesn\'t support required settings.';
            default:
                return 'Camera unavailable. Please check your device.';
        }
    }

    function handleIncomingCall(call) {
        if (call.caller_id === userId) return;

        const incomingCallModalElement = document.getElementById('incomingCallModal');
        if (!incomingCallModalElement) return;

        document.getElementById('incomingCallType').textContent =
            `${call.type} call from ${call.caller?.name || 'Unknown User'}`;

        const incomingCallModal = new bootstrap.Modal(incomingCallModalElement);
        incomingCallModal.show();

        // Clear previous handlers
        const answerBtn = document.getElementById('answerCallBtn');
        const rejectBtn = document.getElementById('rejectCallBtn');
        answerBtn.onclick = null;
        rejectBtn.onclick = null;

        answerBtn.onclick = async function() {
            try {
                incomingCallModal.hide();
                const response = await answerCall(call.id);
                console.log('📞 Call answered:', response.data);
            } catch (error) {
                console.error('Call answer failed:', error);
                showAlert('Failed to answer call');
            }
        };

        rejectBtn.onclick = function() {
            incomingCallModal.hide();
            endCall(call.id);
        };
    }

    async function answerCall(callId) {
        return await axios.post(`/calls/${callId}/answer`);
    }

    function handleCallAnswered(call) {
        if (call.caller_id === userId) {
            initializeCall(call, true);
        }
    }

    function handleCallEnded(call) {
        const callModal = bootstrap.Modal.getInstance(document.getElementById('callModal'));
        if (callModal) {
            callModal.hide();
        }

        if (window.currentCall) {
            window.currentCall.end();
            window.currentCall = null;
        }

        showSystemMessage('Call ended');
    }

    // Signal handling
    window.Echo.private(`user.${userId}`)
        .listen('CallSignal', (e) => {
            if (window.currentCall && e.conversationId === window.currentCall.call.conversation_id) {
                window.currentCall.handleSignal(e.signal);
            }
        });

    // UI Helper functions
    function showAlert(message) {
        const alertElement = document.createElement('div');
        alertElement.className = 'alert alert-warning alert-dismissible fade show';
        alertElement.role = 'alert';
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        const alertsContainer = document.getElementById('alerts-container') || document.body;
        alertsContainer.prepend(alertElement);

        setTimeout(() => {
            alertElement.classList.remove('show');
            setTimeout(() => alertElement.remove(), 150);
        }, 5000);
    }

    function showSystemMessage(message) {
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <p class="text-muted small">${message}</p>
        `;
        messagesContainer.prepend(messageElement);
        scrollToBottom();
    }
});

// Initialize call when loaded
if (typeof initializeCall === 'undefined') {
    window.initializeCall = function(call, isCaller) {
        window.currentCall = new WebRTCCall(call, isCaller);
        window.currentCall.start();
    };
}

if (typeof endCall === 'undefined') {
    window.endCall = function(callId) {
        axios.post(`/calls/${callId}/end`)
            .catch(error => {
                console.error('Failed to end call on server:', error);
            });
    };
}
