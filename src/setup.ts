// setup.ts — jQuery globals, jQuery UI and DigitalJS styles for the Schematic
// viewport. Imported by SchematicViewport, not at app start.
import $ from 'jquery';
import 'jquery-ui-dist/jquery-ui.css';
import '../node_modules/digitaljs/src/style.css';

declare global {
  interface Window {
    $: typeof $;
    jQuery: typeof $;
  }
}

// Bind jQuery to global window object for DigitalJS interop
window.$ = $;
window.jQuery = $;

// jquery-ui-dist is a browser-global bundle, so load it only after jQuery is exposed.
export const setupReady = import('jquery-ui-dist/jquery-ui.min.js');

// Monaco is configured in src/lib/monacoSetup.ts and loaded only by the pages
// that show an editor, so the home page does not download it.
