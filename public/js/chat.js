// resources/js/chat.js
document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('send-message-form');
    const messageInput = messageForm.querySelector('input[name="body"]');
    const messagesContainer = document.querySelector('.conversation-messages');

    // // Initialize Echo
    // window.Echo = new Echo({
    //     broadcaster: 'pusher',
    //     key: process.env.MIX_REVERB_APP_KEY,
    //     wsScheme: window.location.protocol === 'https:' ? 'wss' : 'ws',
    //     wsHost: process.env.MIX_REVERB_HOST,
    //     wsPort: process.env.MIX_REVERB_PORT ?? 80,
    //     wssPort: process.env.MIX_REVERB_PORT ?? 443,
    //     forceTLS: (process.env.MIX_REVERB_SCHEME ?? 'https') === 'https',

    //     enabledTransports: ['ws', 'wss'],
    // });

    // Join conversation channel
    window.conversationChannel = window.Echo.join(`conversation.${conversationId}`)
        .here((users) => {
            console.log('Users in conversation:', users);
        })
        .joining((user) => {
            console.log('User joined:', user);
        })
        .leaving((user) => {
            console.log('User left:', user);
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

    // Send message
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();

        axios.post('/messages', {
            conversation_id: conversationId,
            body: messageInput.value
        }).then(response => {
            messageInput.value = '';
            console.log('✅ Message sent.'+response.data);
            addMessageToChat(response.data);
        }).catch(error => {
            console.log(error);
        });
    });


    // Add message to chat
    function addMessageToChat(message) {
        console.log('📩 Message Received:', message);
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.user_id === userId ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <strong>${message.user_name}</strong>
            <p>${message.body}</p>
            <small>Just now</small>
        `;
        messagesContainer.prepend(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollTop;
    }

    // Initialize call buttons
    document.querySelectorAll('.start-audio-call, .start-video-call').forEach(button => {
        button.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            startCall(type);
        });
    });

    function startCall(type) {
        axios.post('/calls', {
            conversation_id: conversationId,
            type: type
        }).then(response => {
            console.log('📞 Call started:', response.data);
            initializeCall(response.data, true);
        }).catch(error => {
            console.log(error);
        });
    }

    function handleIncomingCall(call) {
        if (call.caller_id === userId) return;

        document.getElementById('incomingCallType').textContent =
            `${call.type} call from ${call.caller_name || 'Unknown User'}`;

        const incomingCallModal = new bootstrap.Modal(document.getElementById('incomingCallModal'));
        incomingCallModal.show();

        document.getElementById('answerCallBtn').onclick = function() {
            answerCall(call.id);
            incomingCallModal.hide();
        };

        document.getElementById('rejectCallBtn').onclick = function() {
            endCall(call.id);
            incomingCallModal.hide();
        };
    }

    function answerCall(callId) {
        axios.post(`/calls/${callId}/answer`)
            .then(response => {
                console.log('📞 Call received:', response.data);
                initializeCall(response.data, false);
            })
            .catch(error => {
                 console.log(error);
            });
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
        // Clean up WebRTC resources
        if (window.currentCall) {
            window.currentCall.end();
            window.currentCall = null;
        }
    }

    // Add to resources/js/chat.js
    window.Echo.private(`user.${userId}`)
    .listen('CallSignal', (e) => {
        if (window.currentCall && e.conversationId === window.currentCall.call.conversation_id) {
            window.currentCall.handleSignal(e.signal);
        }
    });
});
