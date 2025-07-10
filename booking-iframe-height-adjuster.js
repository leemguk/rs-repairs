// booking-iframe-height-adjuster.js
// This script should be included on the parent page (www.ransomspares.co.uk)
// It listens for height messages from the RS Repairs booking form iframe and adjusts the iframe height

(function() {
  // Listen for messages from the iframe
  window.addEventListener('message', function(event) {
    // Security check - only accept messages from your domain
    // In production, replace this with your actual domain
    if (event.origin !== 'https://your-rs-repairs-domain.com') {
      return; // Ignore messages from other domains
    }

    // Check if this is a height message from our booking form
    if (event.data && event.data.type === 'rs-repairs-booking-height') {
      // Find the RS Repairs booking iframe
      const iframe = document.querySelector('iframe[src*="widget/booking"]');
      
      if (iframe && event.data.height) {
        // Add some padding to prevent cut-off
        const newHeight = event.data.height + 20;
        
        // Smooth height transition
        iframe.style.transition = 'height 0.3s ease';
        iframe.style.height = newHeight + 'px';
        
        // Optional: Scroll to iframe if height increased significantly
        // Uncomment if you want this behavior
        // if (newHeight > parseInt(iframe.style.height || '0') + 100) {
        //   iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // }
      }
    }
  });

  // Set initial iframe height when page loads
  window.addEventListener('load', function() {
    const iframe = document.querySelector('iframe[src*="widget/booking"]');
    if (iframe) {
      // Set initial height
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.width = '100%';
    }
  });
})();