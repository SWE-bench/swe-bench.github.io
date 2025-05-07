
function initCitationFormatSwitcher() {
  // Hide all non-bibtex citation formats on load
  document.querySelectorAll('.citation-container').forEach(el => {
    if (!el.id.includes('-bibtex')) {
      el.classList.add('display-none');
    }
  });
  
  // Format switching functionality
  const formatButtons = document.querySelectorAll('.citation-format-btn');
  
  formatButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const format = this.getAttribute('data-format');
      const target = this.getAttribute('data-target');
      
      // Update active button
      const siblings = this.parentElement.querySelectorAll('.citation-format-btn');
      siblings.forEach(sib => sib.classList.remove('active'));
      this.classList.add('active');
      
      // Special handling for verified section
      if (target === 'verified-citation') {
        // Hide all citation containers in this section
        const section = this.closest('.citation-section');
        section.querySelectorAll('.citation-container').forEach(el => {
          el.classList.add('display-none');
          el.classList.remove('display-block');
        });
        
        // Show only the containers for the selected format
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
        // Standard handling for other sections
        // First hide all citation containers with this target prefix
        document.querySelectorAll(`[id^="${target}-"]`).forEach(el => {
          el.classList.add('display-none');
          el.classList.remove('display-block');
        });
        
        // Then show only the one with the selected format
        const container = document.getElementById(`${target}-${format}`);
        if (container) {
          container.classList.remove('display-none');
          container.classList.add('display-block');
        }
      }
    });
  });
}

// Initialize the citation format switcher when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initCitationFormatSwitcher); 