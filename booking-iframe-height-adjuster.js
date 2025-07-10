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
        // Detect mobile
        const isMobile = window.innerWidth <= 768;
        
        // Add generous padding to prevent cut-off and eliminate scroll
        const padding = isMobile ? 80 : 60;
        const newHeight = event.data.height + padding;
        const currentHeight = parseInt(iframe.style.height) || 0;
        
        // More sensitive threshold for mobile
        const threshold = isMobile ? 5 : 10;
        
        console.log('Parent received height:', event.data.height, 'New height:', newHeight, 'Mobile:', isMobile, 'Data mobile:', event.data.mobile); // Debug log
        
        // For mobile, be more aggressive about updating
        const shouldUpdate = isMobile ? 
          Math.abs(newHeight - currentHeight) > 1 : 
          Math.abs(newHeight - currentHeight) > threshold;
        
        // Only update if height change is significant
        if (shouldUpdate || event.data.mobile) {
          // Smooth height transition (faster on mobile)
          iframe.style.transition = isMobile ? 'height 0.1s ease' : 'height 0.3s ease';
          iframe.style.height = newHeight + 'px';
          
          console.log('Updated iframe height to:', newHeight + 'px', 'Was mobile message:', event.data.mobile); // Debug log
          
          // Optional: Scroll to iframe if height increased significantly
          // Uncomment if you want this behavior
          // if (newHeight > currentHeight + 100) {
          //   iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // }
        }
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