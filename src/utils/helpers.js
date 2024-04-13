const colorPalette = [
    '#117733',
    '#44AA99',
    '#88CCEE',
    '#DDCC77',
    '#CC6677',
    '#AA4499',
    '#882255',
    '#E69F00',
    '#56B4E9',
    '#009E73',
    '#F0E442',
    '#0072B2',
    '#D55E00',
    '#CC79A7',
    '#000000'
];


export function getColor(index) {
    const color = colorPalette[index % colorPalette.length]; // Use modulo to loop around
    return color;
}

export function mapPurchaseType(type) {
    switch (type.toLowerCase()) {
        case 'in_store':
        case 'instore':
            return 'In store';
        case 'ghs':
            return 'Delivery';
        default:
            return type;
    }
}


export function makeStringNameSafe(inputString) {
    // Replace all spaces with hyphens
    let formattedString = inputString.replace(/\s+/g, '-');
  
    // Remove all non-alphanumeric characters except hyphens
    formattedString = formattedString.replace(/[^a-zA-Z0-9-]/g, '');
  
    return formattedString;
  }




  export function formatDate(date) {
    // Create a new Date object from the input date
    const dateObj = new Date(date);

    const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return formattedDate;
}


export function formatSQLDate(date) {
    // Get the year, month, and day components from the Date object
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zero if necessary
    const day = String(date.getDate()).padStart(2, '0'); // Add leading zero if necessary

    // Concatenate the components to form the formatted date string
    const formattedDate = `${year}-${month}-${day}`;

    return formattedDate;
}




export function formatPrettyDate(date) {
    // Create a new Date object from the input date
    const dateObj = new Date(date);

    const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return formattedDate;
}


export function formatValue(value) {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2
    }).format(value);
}


// Helper function to find store info by storeId
export function findStoreInfo(storeId,storeNames) {
    // Ensure storeId is treated as a string for comparison
    const storeIdStr = storeId.toString();
    return storeNames.find(store => store.storeId === storeIdStr);
}

export async function secureHash(str) {
    // Check if the crypto.subtle API is available and the page is served over HTTPS
    if (window.crypto && window.crypto.subtle && window.location.protocol === 'https:') {
        // Encode the string into a Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(str);

        // Use the Web Crypto API to hash the data
        try {
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            // Convert the buffer to a hexadecimal string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.error('Hashing failed:', error);
        }
    }
    // Fallback to the simple hash function if the Web Crypto API is not available
    return simpleHash(str);
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}


export function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// Function to generate a random offset within a given range
export function generateRandomOffset(range = 0.2) {
    // Generate a random offset within the range [-range/2, range/2]
    return (Math.random() * range) - (range / 2);
}

export function shiftValue(value, offset) {
    // Convert the input to a float to ensure accurate comparisons
    const numericValue = parseFloat(value);

    // Check if the value is 0 (considering possible floating point precision issues)
    if (Math.abs(numericValue) < 1e-9) { // 1e-9 is a small number close to 0 to account for floating point errors
        return "0.00"; // Return "0.00" as a string to match the expected format
    }

    // If the value is not 0, apply the offset and return the result
    const newValue = numericValue + offset;
    return newValue.toFixed(2); // Convert the result to a string with two decimal places
}


export function showToast(message, type) {

    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.classList.add('toast', 'show', 'align-items-center', 'mb-2', 'position-relative', 'bg-white');
    toast.role = 'alert';
    
    // Capitalize the first letter of the type for display
    const capitalisedType = type.charAt(0).toUpperCase() + type.slice(1);
    
    // Use the ternary operator to determine the class based on the type
    toast.innerHTML = `
        <div class="toast-body fs-4"><div class="fw-bold ${type === 'success' ? 'text-success' : 'text-danger'}">${capitalisedType}!</div><div>${message}</div></div>
        <button type="button" class="btn-close position-absolute top-0 end-0" data-coreui-dismiss="toast" aria-label="Close"></button>
    `;    

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('show');
      toastContainer.removeChild(toast);
    }, 20000); // Auto-remove the toast after 20 seconds
  }
