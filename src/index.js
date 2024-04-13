// Importing CSS
import '@coreui/coreui/dist/css/coreui.css';
import 'aos/dist/aos.css';
import './styles/style.css';

// Importing JavaScript
import '@coreui/coreui';
import { downloadCSV  } from './utils/display.js';
import { handleFileInputChange  } from './utils/processData.js';

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


//Modal listener
document.addEventListener('DOMContentLoaded', function() {
    
    const myModal = document.getElementById('myModal');
    myModal.addEventListener('show.coreui.modal', event => {
        const button = event.relatedTarget; // Button that triggered the modal

        // Extract info from data-coreui-* attributes
        const modalTitleContent = button.getAttribute('data-coreui-title');
        const contentFile = button.getAttribute('data-coreui-content');
        const contentFile2 = button.getAttribute('data-coreui-content2');
        const footerFile = button.getAttribute('data-coreui-footer');

        // Set the content of #myModalLabel
        const modalTitle = myModal.querySelector('#myModalLabel');
        if (modalTitle) {
            modalTitle.textContent = modalTitleContent;
        }

        // Function to load content from a URL
        const fetchContent = async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error loading modal content from ${url}`);
            return await response.text();
        };

        // Load the main content from contentFile
        fetchContent(contentFile)
        .then(contentHtml => {
            // Check if there is a second content file
            if (contentFile2) {
                // Fetch the second content file
                return fetchContent(contentFile2).then(contentHtml2 => contentHtml + contentHtml2);
            }
            return contentHtml;
        })
        .then(fullContentHtml => {
            // Set the combined content to modal body
            myModal.querySelector('#myModalBody').innerHTML = fullContentHtml;

            // Load footer if specified
            if (footerFile) {
                return fetchContent(footerFile).then(footerHtml => {
                    myModal.querySelector('#myModalFooterButtons').innerHTML = footerHtml;
                });
            } else {
                myModal.querySelector('#myModalFooterButtons').innerHTML = '';
            }
        })
        .catch(error => {
            console.error('Error loading content:', error);
            myModal.querySelector('#myModalBody').innerHTML = '<p>Sorry, the content could not be loaded.</p>';
        });
    });
});
 