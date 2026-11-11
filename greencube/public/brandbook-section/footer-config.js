(function () {
  'use strict';

  // Endpointul comun salveaza cererile si le expune doar in panoul /admin/.
  window.GREENTECH_CHARITY_CONFIG = Object.assign({
    formEndpoint: '/api/submissions'
  }, window.GREENTECH_CHARITY_CONFIG || {});
})();
