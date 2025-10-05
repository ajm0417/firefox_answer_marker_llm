document.addEventListener('DOMContentLoaded', function() {
  const questionCount = document.getElementById('questionCount');
  const highlightCount = document.getElementById('highlightCount');
  const questionList = document.getElementById('questionList');
  const noQuestions = document.getElementById('noQuestions');
  const refreshBtn = document.getElementById('refreshBtn');

  function updateResults() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getResults'}, function(response) {
        if (response) {
          displayResults(response);
        }
      });
    });
  }

  function displayResults(results) {
    questionCount.textContent = results.totalQuestions;
    highlightCount.textContent = results.questions.filter(q => q.correctAnswer !== 'Unknown').length;
    
    if (results.questions.length > 0) {
      noQuestions.style.display = 'none';
      questionList.innerHTML = '';
      
      results.questions.forEach((question, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.innerHTML = `
          <div class="question-text">${index + 1}. ${question.question.substring(0, 100)}${question.question.length > 100 ? '...' : ''}</div>
          <div class="correct-answer">✓ ${question.correctAnswer}</div>
        `;
        questionList.appendChild(questionItem);
      });
    } else {
      noQuestions.style.display = 'block';
    }
  }

  refreshBtn.addEventListener('click', updateResults);
  
  // Load initial results
  updateResults();
});
