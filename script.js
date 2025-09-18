const questionInput = document.getElementById('questionInput');
        const askButton = document.getElementById('askButton');
        const outputArea = document.getElementById('outputArea');
        const loadingIndicator = document.getElementById('loadingIndicator');

        // IMPORTANT: Replace with your actual Google Generative AI API Key
        // For production, consider using a backend to proxy API calls to hide your key.
        const GEMINI_API_KEY = "AIzaSyA_mqidYKy1QCxswuX_fr50gQdcuE9aHyM"; // REPLACE THIS!
        const MODEL_NAME = "gemini-2.5-flash"; // Using gemini-1.5-flash for potentially faster chat-like responses

        const systemInstructionText = `You are a Data Structure and Algorithm Instructor. You will only reply to the problem related
    to the Data Structure and Algorithm. You have to solve query of user in simplest way.
    If user ask any question not related to Data Structure and Algorithm, reply him rudely
    Example: If user ask, How are you
    You will reply: You dumbo ask me some sensible question related to Data Structure and Algorithm you can reply him more rudely and say anything.

    you have to reply him rudely if question is not related to Data Structure and Algorithm.
    Else reply him politely with simple explanation`;

        askButton.addEventListener('click', async () => {
            const question = questionInput.value.trim();

            if (!question) {
                outputArea.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Please enter a DSA question first!</div>';
                return;
            }

            outputArea.innerHTML = ''; // Clear previous output
            loadingIndicator.style.display = 'block';
            askButton.disabled = true;

            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

            const requestBody = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: question }
                        ]
                    }
                ],
                systemInstruction: {
                    parts: [
                        { text: systemInstructionText }
                    ]
                }
            };

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    let errorMsg = `API Error: ${response.status}`;
                    let errorDetails = "Could not retrieve error details.";
                    try {
                        const errorData = await response.json();
                        if (errorData.error && errorData.error.message) {
                           errorDetails = errorData.error.message;
                        }
                        errorMsg = `${errorMsg} - ${errorDetails}`;
                        if (errorData.error && errorData.error.status) {
                            errorMsg += ` (Status: ${errorData.error.status})`;
                        }
                        if (errorDetails.toLowerCase().includes("api key not valid") || errorDetails.toLowerCase().includes("permission denied")) {
                            errorMsg += "<br><strong>Please double-check your API key and ensure it's correctly enabled for the Gemini API in your Google Cloud Console or AI Studio.</strong>";
                        }
                    } catch (parseError) {
                        errorMsg = `${errorMsg} (Could not parse error response: ${response.statusText})`;
                    }
                    throw new Error(errorMsg);
                }

                const data = await response.json();

                if (data.candidates && data.candidates.length > 0 &&
                    data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                    const answerText = data.candidates[0].content.parts[0].text;

                    // Check for "rude" keywords to apply special styling
                    const isRudeResponse = /(dumbo|sensible question|rudely|nonsense|focus|irrelevant|ask something useful)/i.test(answerText);

                    // Simple formatting for code blocks and inline code
                    let formattedText = answerText;

                    // Handle multi-line code blocks (```language ... ```)
                    formattedText = formattedText.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                        // lang argument is often ignored by basic markdown-to-html parsers
                        // For display, we just wrap in pre and code.
                        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
                    });

                    // Handle inline code (`code`)
                    formattedText = formattedText.replace(/`([^`]+)`/g, (match, code) => {
                        return `<code>${escapeHtml(code)}</code>`;
                    });

                    // Convert basic line breaks to paragraphs or list items for better readability
                    // This is a more robust way to handle general text
                    const lines = formattedText.split('\n');
                    let htmlOutput = '';
                    let inList = false;

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                            if (!inList) {
                                htmlOutput += '<ul>';
                                inList = true;
                            }
                            htmlOutput += `<li>${trimmedLine.substring(2)}</li>`;
                        } else {
                            if (inList) {
                                htmlOutput += '</ul>';
                                inList = false;
                            }
                            if (trimmedLine !== '') {
                                // Check if it's already a pre block, if so, don't wrap in p
                                if (trimmedLine.startsWith('<pre>')) {
                                    htmlOutput += trimmedLine;
                                } else {
                                    htmlOutput += `<p>${trimmedLine}</p>`;
                                }
                            }
                        }
                    }
                    if (inList) { // Close list if still open
                        htmlOutput += '</ul>';
                    }

                    if (isRudeResponse) {
                        outputArea.innerHTML = `<div class="rude-response">${htmlOutput}</div>`;
                    } else {
                        outputArea.innerHTML = htmlOutput;
                    }

                } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                     outputArea.innerHTML = `<div class="error-message"><i class="fas fa-ban"></i> Response Blocked: ${data.promptFeedback.blockReason}. ${data.promptFeedback.blockReasonMessage || ''}</div>`;
                } else {
                    console.warn("Unexpected response structure or empty content:", data);
                    outputArea.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Received an unexpected or empty response from the AI.</div>';
                }

            } catch (error) {
                console.error('Frontend Error:', error);
                outputArea.innerHTML = `<div class="error-message"><i class="fas fa-bug"></i> Failed to get answer: ${error.message}</div>`;
            } finally {
                askButton.disabled = false;
                loadingIndicator.style.display = 'none';
            }
        });

        // Helper function to escape HTML for code blocks
        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, function(m) { return map[m]; });
        }


        // Allow Enter key (but not Shift+Enter) in textarea to submit
        questionInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                askButton.click();
            }
        });

        // Demo functionality for UI elements (sidebar clicks)
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', function() {
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Initial welcome message with example, after a short delay
        // setTimeout(() => {
//             outputArea.innerHTML = `
//                 <p><strong>Welcome to DSA Instructor AI!</strong> I'm ready to help you master Data Structures and Algorithms.</p>
//                 <p>Here's an example of a good DSA question:</p>
//                 <p><strong>Question:</strong> Explain the concept of a "linked list" and its basic operations.</p>
//                 <p><strong>Answer:</strong> A <code>linked list</code> is a linear data structure where elements are not stored at contiguous memory locations. Instead, elements are linked using pointers.</p>
//                 <p>Basic operations include:</p>
//                 <ul>
//                     <li><code>Insertion:</code> Adding a new node.</li>
//                     <li><code>Deletion:</code> Removing an existing node.</li>
//                     <li><code>Traversal:</code> Visiting all nodes from start to end.</li>
//                     <li><code>Search:</code> Finding a node with a specific value.</li>
//                 </ul>
//                 <p>Example of a Node:</p>
//                 <pre><code>class Node {
//   constructor(data) {
//     this.data = data;
//     this.next = null; // Pointer to the next node
//   }
// }</code></pre>
//                 <p>Now, try asking your own DSA question!</p>
//             `;
        // }, 1000);