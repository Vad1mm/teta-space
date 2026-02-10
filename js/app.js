/** TETA — Entry point */
import { AppController } from './core/app-controller.js';

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.tetaApp = new AppController();
});
