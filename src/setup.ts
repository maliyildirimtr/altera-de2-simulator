// setup.ts
import $ from 'jquery';
import 'jquery-ui-dist/jquery-ui.css';
import '../node_modules/digitaljs/src/style.css';

declare global {
  interface Window {
    $: typeof $;
    jQuery: typeof $;
    monaco: typeof monaco;
  }
}

// Bind jQuery to global window object for DigitalJS interop
window.$ = $;
window.jQuery = $;

// jquery-ui-dist is a browser-global bundle, so load it only after jQuery is exposed.
export const setupReady = import('jquery-ui-dist/jquery-ui.min.js');

// Monaco Editor Configuration
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';

self.MonacoEnvironment = {
  getWorker(_moduleId: string, _label: string) {
    return new EditorWorker();
  }
};

loader.config({ monaco });
window.monaco = monaco;
