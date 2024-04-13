// Importing CSS
import '@coreui/coreui/dist/css/coreui.css';
import 'aos/dist/aos.css';
import './styles/style.css';

// Importing JavaScript
import '@coreui/coreui';
import { downloadCSV, setupProductCountEventListeners, setupModalListener } from './utils/display.js';
import { handleFileInputChange  } from './utils/processData.js';
import { setupContributeButtonEventListener  } from './utils/postTescoAnon.js';

window.downloadCSV = downloadCSV;

// Importing custom scripts
import './utils/helpers.js';
import './utils/charts.js';
import './utils/postTescoAnon.js';
import './utils/processData.js';



 // Your code that initializes or uses the imported modules

 //file listener
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('fileInput').addEventListener('change', handleFileInputChange);
});

//event listener for changing dropdown lists
setupProductCountEventListeners();

//event listener for contribution button
setupContributeButtonEventListener();

//Modal listener
setupModalListener();
 