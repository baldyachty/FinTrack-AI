// js/chatbot.js 

class Chatbot {
  constructor() {
    this.elements = {
      toggleButton: document.getElementById('chatbotToggle'),
      container: document.getElementById('chatbotContainer'),
      messagesArea: document.getElementById('chatbotMessages'),
      inputField: document.getElementById('chatbotInput'),
      sendButton: document.getElementById('chatbotSendBtn'),
    };

    const authDataString = localStorage.getItem('fintrack_auth');
    this.authData = authDataString ? JSON.parse(authDataString) : null;

    // Check if all necessary HTML elements are present
    if (!this.elements.toggleButton || !this.elements.container || !this.elements.messagesArea || !this.elements.inputField || !this.elements.sendButton) {
      console.error("Chatbot elements not found! Ensure the HTML structure is correct.");
      // Optionally, disable the chatbot toggle if elements are missing
      if(this.elements.toggleButton) this.elements.toggleButton.style.display = 'none';
      return; // Stop initialization if elements are missing
    }

    this.isOpen = false;
    this.setupEventListeners();
    console.log("Chatbot initialized successfully."); // Confirmation message
  }

  setupEventListeners() {
    this.elements.toggleButton.addEventListener('click', () => this.toggle());
    this.elements.sendButton.addEventListener('click', () => this.sendMessage());
    // Allow sending message with Enter key
    this.elements.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { // Prevent sending on Shift+Enter
        e.preventDefault(); // Prevent default Enter behavior (like line break)
        this.sendMessage();
      }
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.elements.container.classList.toggle('show', this.isOpen);
    this.elements.toggleButton.classList.toggle('active', this.isOpen);
    if (this.isOpen) {
      this.elements.inputField.focus(); // Focus input when opened
      this.addMessage("Hello! How can I help you with your finances today?", 'bot'); // Add welcome message only when opened
    } else {
        
        // this.elements.messagesArea.innerHTML = '';
    }
  }

  sendMessage() {
    const messageText = this.elements.inputField.value.trim();
    if (!messageText) return; // Don't send empty messages

    this.addMessage(messageText, 'user');
    this.elements.inputField.value = ''; // Clear input field
    this.elements.inputField.focus(); // Keep focus on input

    // Simulate bot thinking and response
    this.showTypingIndicator();
    setTimeout(() => {
      this.generateBotResponse(messageText);
    }, 1200); // Simulate network delay/thinking time
  }

  addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text; // Use textContent for security (prevents HTML injection)
    this.elements.messagesArea.appendChild(messageDiv);
    this.scrollToBottom(); // Scroll down to show the new message
  }

  showTypingIndicator() {
    // Check if typing indicator already exists
    if (document.getElementById('typingIndicator')) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing';
    typingDiv.id = 'typingIndicator'; // Add ID for easy removal
    typingDiv.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    this.elements.messagesArea.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // [In js/chatbot.js]

  async generateBotResponse(userMessage) {
    if (!this.authData || !this.authData.token) {
        this.addMessage("I can't seem to connect. Please make sure you are logged in.", 'bot');
        this.hideTypingIndicator();
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authData.token}`
            },
            body: JSON.stringify({ query: userMessage })
        });

        const data = await response.json();
        
        // Hide the "..." typing indicator
        this.hideTypingIndicator();

        if (response.ok) {
            // Add the AI's answer
            this.addMessage(data.answer, 'bot');
        } else {
            // Add the error message from the API
            this.addMessage(data.answer || "Sorry, I ran into an error.", 'bot');
        }

    } catch (error) {
        console.error("Error calling chat API:", error);
        this.hideTypingIndicator();
        this.addMessage("Sorry, I'm having trouble connecting right now.", 'bot');
    }
  }

  scrollToBottom() {
    // Scrolls the message area down smoothly
    this.elements.messagesArea.scrollTo({
        top: this.elements.messagesArea.scrollHeight,
        behavior: 'smooth'
    });
  }
}

// Initialize the chatbot once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Ensure Utils is loaded before initializing Chatbot if it has dependencies
  if (window.Utils) {
      window.chatbot = new Chatbot();
  } else {
      console.error("Utils not found, Chatbot initialization skipped.");
  }
});