
function initCitationCopy() {
  const copyBtns = document.querySelectorAll('.citation-container .copy-btn');
  
  copyBtns.forEach(btn => {
    const citationText = btn.closest('.citation-container').querySelector('pre');
    
    if (btn && citationText) {
      btn.addEventListener('click', function() {
        const textToCopy = citationText.textContent.trim();
        
        // Create a temporary element for copying
        const tempElement = document.createElement('textarea');
        tempElement.value = textToCopy;
        tempElement.setAttribute('readonly', '');
        tempElement.style.position = 'absolute';
        tempElement.style.left = '-9999px';
        document.body.appendChild(tempElement);
        
        // Select and copy
        tempElement.select();
        document.execCommand('copy');
        document.body.removeChild(tempElement);
        
        // Visual feedback
        btn.classList.add('copy-success');
        btn.textContent = 'Copied!';
        
        // Reset after 2 seconds
        setTimeout(function() {
          btn.classList.remove('copy-success');
          btn.textContent = 'Copy';
        }, 2000);
      });
    }
  });
}

// Initialize the citation copy functionality when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initCitationCopy); 