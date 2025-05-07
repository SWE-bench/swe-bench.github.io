function initCitationFormatSwitcher() {
  document.querySelectorAll('.citation-container').forEach(el => {
    if (!el.id.includes('-bibtex')) {
      el.classList.add('display-none');
    }
  });
  
  const formatButtons = document.querySelectorAll('.citation-format-btn');
  
  formatButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const format = this.getAttribute('data-format');
      const target = this.getAttribute('data-target');
      
      const siblings = this.parentElement.querySelectorAll('.citation-format-btn');
      siblings.forEach(sib => sib.classList.remove('active'));
      this.classList.add('active');
      
      if (target === 'verified-citation') {
        const section = this.closest('.citation-section');
        section.querySelectorAll('.citation-container').forEach(el => {
          el.classList.add('display-none');
          el.classList.remove('display-block');
        });
        
        const mainContainer = document.getElementById(`${target}-${format}`);
        const blogContainer = document.getElementById(`${target}-blog-${format}`);
        
        if (mainContainer) {
          mainContainer.classList.remove('display-none');
          mainContainer.classList.add('display-block');
        }
        
        if (blogContainer) {
          blogContainer.classList.remove('display-none');
          blogContainer.classList.add('display-block');
        }
      } else {
        document.querySelectorAll(`[id^="${target}-"]`).forEach(el => {
          el.classList.add('display-none');
          el.classList.remove('display-block');
        });
        
        const container = document.getElementById(`${target}-${format}`);
        if (container) {
          container.classList.remove('display-none');
          container.classList.add('display-block');
        }
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initCitationFormatSwitcher); 