class AnswerHighlighter {
  constructor() {
    this.questions = [];
    this.correctAnswers = new Map();
    this.init();
  }

  init() {
    this.detectQuestions();
    this.addHighlightStyles();
    this.setupMutationObserver();
  }

  detectQuestions() {
    // Common question patterns
    const questionSelectors = [
      // Multiple choice questions
      '.question, .quiz-question, .mcq, .multiple-choice',
      // Questions containing question marks
      '*:contains("?")',
      // Common quiz platforms
      '[data-type="question"], [class*="question"]',
      // Lists that might be answer choices
      'ol, ul'
    ];

    questionSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          this.analyzeElement(element);
        });
      } catch (e) {
        console.log('Error with selector:', selector, e);
      }
    });
  }

  analyzeElement(element) {
    const text = element.textContent.trim();
    
    // Check if element contains a question
    if (this.isQuestion(text)) {
      const questionData = this.extractQuestionData(element, text);
      if (questionData) {
        this.questions.push(questionData);
        this.highlightCorrectAnswer(questionData);
      }
    }
  }

  isQuestion(text) {
    const questionIndicators = [
      /\?$/,
      /^(what|who|when|where|why|how|which).*\?/i,
      /question\s*\d+/i,
      /select.*correct|choose.*right/i
    ];
    
    return questionIndicators.some(pattern => pattern.test(text));
  }

  extractQuestionData(element, text) {
    const answerChoices = this.findAnswerChoices(element);
    
    if (answerChoices.length > 0) {
      return {
        element: element,
        text: text,
        choices: answerChoices,
        correctAnswer: this.identifyCorrectAnswer(answerChoices)
      };
    }
    
    return null;
  }

  findAnswerChoices(questionElement) {
    const choices = [];
    
    // Look for common answer choice patterns
    const choiceSelectors = [
      // List items
      'li',
      // Radio buttons and labels
      'input[type="radio"] + label',
      'label',
      // Options in select elements
      'option',
      // Common class patterns
      '[class*="choice"], [class*="option"], [class*="answer"]',
      // Next sibling elements
      '.question ~ div, .question ~ p'
    ];

    choiceSelectors.forEach(selector => {
      const elements = questionElement.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent.trim();
        if (text && this.isLikelyAnswerChoice(text)) {
          choices.push({
            element: el,
            text: text,
            isCorrect: this.isLikelyCorrectAnswer(text)
          });
        }
      });
    });

    return choices;
  }

  isLikelyAnswerChoice(text) {
    // Common answer patterns
    const patterns = [
      /^[A-D][\.\)]\s+.+/i,  // A. Answer, B) Answer
      /^\d+\.\s+.+/,         // 1. Answer
      /^[•\-]\s+.+/,         // • Answer, - Answer
      /^answer\s*[A-D]/i     // Answer A, etc.
    ];
    
    return patterns.some(pattern => pattern.test(text)) && 
           text.length < 200; // Reasonable answer length
  }

  isLikelyCorrectAnswer(text) {
    const correctIndicators = [
      /\b(correct|right|true|yes)\b/i,
      /✓/,
      /\[x\]/i,
      /checked|selected/i,
      /answer\s*key/i
    ];
    
    return correctIndicators.some(pattern => pattern.test(text));
  }

  identifyCorrectAnswer(choices) {
    // First, check for obviously marked correct answers
    const obviousCorrect = choices.find(choice => choice.isCorrect);
    if (obviousCorrect) return obviousCorrect;

    // If no obvious correct answer, use simple heuristics
    // This is where you'd integrate with an API or more sophisticated logic
    return this.guessCorrectAnswer(choices);
  }

  guessCorrectAnswer(choices) {
    // Simple heuristic: longest answer is often correct
    return choices.reduce((longest, current) => 
      current.text.length > longest.text.length ? current : longest, choices[0]
    );
  }

  highlightCorrectAnswer(questionData) {
    if (questionData.correctAnswer) {
      const correctElement = questionData.correctAnswer.element;
      correctElement.classList.add('correct-answer-highlight');
      
      // Store reference
      this.correctAnswers.set(questionData.element, questionData.correctAnswer);
      
      console.log('Highlighted correct answer:', {
        question: questionData.text,
        correctAnswer: questionData.correctAnswer.text
      });
    }
  }

  addHighlightStyles() {
    // Styles are injected via CSS file, but we can add dynamic ones if needed
    if (!document.getElementById('answer-highlighter-dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'answer-highlighter-dynamic-styles';
      style.textContent = `
        .correct-answer-highlight {
          position: relative;
        }
        .correct-answer-highlight::after {
          content: " ✓ Correct";
          color: #28a745;
          font-weight: bold;
          margin-left: 5px;
        }
      `;
      document.head.appendChild(style);
    }
  }

  setupMutationObserver() {
    // Watch for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            this.analyzeElement(node);
            node.querySelectorAll('*').forEach(child => {
              this.analyzeElement(child);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  getResults() {
    return {
      totalQuestions: this.questions.length,
      questions: this.questions.map(q => ({
        question: q.text,
        correctAnswer: q.correctAnswer ? q.correctAnswer.text : 'Unknown'
      }))
    };
  }
}

// Initialize the highlighter when page loads
let highlighter;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    highlighter = new AnswerHighlighter();
  });
} else {
  highlighter = new AnswerHighlighter();
}

// Listen for messages from popup/background scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getResults') {
    sendResponse(highlighter ? highlighter.getResults() : { totalQuestions: 0, questions: [] });
  }
  return true;
});
