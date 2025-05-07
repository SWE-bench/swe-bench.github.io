function initCitationCopy() {
  const copyBtns = document.querySelectorAll('.citation-container .copy-btn');
  
  copyBtns.forEach(btn => {
    const citationText = btn.closest('.citation-container').querySelector('pre');
    
    if (btn && citationText) {
      btn.addEventListener('click', function() {
        const textToCopy = citationText.textContent.trim();
        
        const tempElement = document.createElement('textarea');
        tempElement.value = textToCopy;
        tempElement.setAttribute('readonly', '');
        tempElement.style.position = 'absolute';
        tempElement.style.left = '-9999px';
        document.body.appendChild(tempElement);
        
        tempElement.select();
        document.execCommand('copy');
        document.body.removeChild(tempElement);
        
        btn.classList.add('copy-success');
        btn.textContent = 'Copied!';
        
        setTimeout(function() {
          btn.classList.remove('copy-success');
          btn.textContent = 'Copy';
        }, 2000);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', initCitationCopy); 