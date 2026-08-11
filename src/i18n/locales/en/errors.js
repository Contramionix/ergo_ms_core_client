export default {
  boot: {
    badge: 'Startup error',
    title: 'Failed to load the application',
    failed: 'Refresh the page or check that the API is running.',
    hint: 'If this keeps happening, make sure the API server is available and try again.',
    failedLog: 'Failed to start the client:',
  },
  stale: {
    badge: 'Outdated version',
    title: 'This page is outdated after an update',
    failed: 'An older UI build is still loaded. Refresh the page to get the new client.',
    hint: 'If this keeps appearing, close extra app tabs and open the site again.',
    failedLog: 'Stale client after deploy:',
  },
  api: {
    generic: 'An error occurred',
    tryLater: 'An error occurred. Please try again later.',
    network: 'Could not reach the server',
    forbidden: 'Insufficient permissions',
    notFound: 'Resource not found',
    validation: 'Please check the form fields',
    server: 'Server error',
  },
  page: {
    notFound: 'Page not found',
    notFoundDescription: 'The requested page does not exist or has been removed.',
    goHome: 'Go home',
  },
  maintenance: {
    title: 'Maintenance',
    description: 'The system is temporarily unavailable. Please try again later.',
  },
}
