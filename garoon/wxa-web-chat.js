/**
 * watsonx Assistant Web Chat - Custom Service Desk Extension
 * Bridge to Slack via IBM Code Engine
 */
(function() {
    "use strict";

    // --- Configuration: Environment specific values ---
    // Please replace these with your own environment settings
    const CONFIG = {
        CE_BASE_URL: "YOUR_CODE_ENGINE_APP_URL", // e.g., https://...codeengine.appdomain.cloud
        INTEGRATION_ID: "YOUR_WXA_INTEGRATION_ID",
        REGION: "YOUR_WXA_REGION", // e.g., "wxo-us-south"
        SERVICE_INSTANCE_ID: "YOUR_WXA_SERVICE_INSTANCE_ID"
    };

    /**
     * Custom Service Desk Class
     * @param {Object} parameters - Provided by Web Chat instance
     */
    function MyCustomServiceDesk(parameters) {
        this.instance = parameters.instance;
        this.callback = parameters.callback; 
        this.pollInterval = null;
    }

    /**
     * Returns the identification name of the service desk
     */
    MyCustomServiceDesk.prototype.getName = function() {
        return 'MyCustomSlackServiceDesk';
    };

    /**
     * Check if any agents are online
     * Always returns true for this bridge implementation
     */
    MyCustomServiceDesk.prototype.areAnyAgentsOnline = async function() {
        return true; 
    };

    /**
     * Initialization when starting a human agent chat
     */
    MyCustomServiceDesk.prototype.startChat = function(data) {
        const self = this;

        return new Promise((resolve, reject) => {
            fetch(`${CONFIG.CE_BASE_URL}/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to initialize chat session');
                
                // Start polling for agent messages
                self.startPolling();

                // Notify Web Chat that the agent has joined
                const agentProfile = { nickname: 'Slackエージェント' };
                self.callback.agentJoined(agentProfile);

                resolve();
            })
            .catch((e) => {
                console.error("StartChat Error:", e);
                if (self.callback.onError) {
                    self.callback.onError(e);
                }
                reject(e);
            });
        });
    };

    /**
     * Send user messages to the Slack agent
     */
    MyCustomServiceDesk.prototype.sendMessageToAgent = async function(data) {
        // Input text is retrieved from data.input.text
        const messageText = data.input && data.input.text;

        try {
            await fetch(`${CONFIG.CE_BASE_URL}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: messageText,
                    user_id: data.user_id
                })
            });
        } catch (e) {
            console.error("SendMessage Error:", e);
        }
    };

    /**
     * Poll for messages from the Slack agent
     */
    MyCustomServiceDesk.prototype.startPolling = function() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        const self = this;

        this.pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`${CONFIG.CE_BASE_URL}/poll`);
                const pollData = await res.json();
                
                if (pollData.messages && pollData.messages.length > 0) {
                    pollData.messages.forEach(msg => {
                        self.callback.sendMessageToUser({
                            output: {
                                generic: [{
                                    response_type: 'text',
                                    text: msg.text
                                }]
                            }
                        });
                    });
                }
            } catch (e) { 
                console.error("Polling error:", e); 
            }
        }, 3000); // Polling interval: 3 seconds
    };

    /**
     * Cleanup when the chat session ends
     */
    MyCustomServiceDesk.prototype.endChat = function() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    };

    // --- Web Chat Configuration ---
    window.watsonAssistantChatOptions = {
        integrationID: CONFIG.INTEGRATION_ID,
        region: CONFIG.REGION,
        serviceInstanceID: CONFIG.SERVICE_INSTANCE_ID,
        showRestartButton: true,
        serviceDeskFactory: (parameters) => new MyCustomServiceDesk(parameters),
        onLoad: function(instance) {
            instance.render();
        }
    };

    // Load Watson Assistant Chat Entry
    const t = document.createElement('script');
    t.src = "https://web-chat.global.assistant.watson.appdomain.cloud/versions/latest/WatsonAssistantChatEntry.js";
    document.head.appendChild(t);
})();