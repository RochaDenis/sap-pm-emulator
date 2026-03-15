/**
 * dashboard-link.js
 * Injected into Swagger UI via customJs option.
 * Adds a floating "📊 Dashboard" link to Swagger pages.
 */
(function () {
  window.addEventListener('load', function () {
    var a = document.createElement('a');
    a.href = '/dashboard';
    a.className = 'dashboard-link';
    a.textContent = '📊 Dashboard';
    a.title = 'Go to AxiomGO Control Room';
    document.body.appendChild(a);
  });
})();
