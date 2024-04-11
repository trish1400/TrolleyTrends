function displayInProgress() {
	const upload = document.getElementById('uploadJson');
	upload.style.display = 'none'; 
    const spinner = document.getElementById('spinner');
    const spinnerTrolley = document.getElementById('spinnerTrolley');
    spinner.style.display = 'flex'; // Use flex instead of block to enable flexbox properties
    spinner.classList.add('d-flex'); // Add d-flex to enable flex container properties
    spinnerTrolley.classList.add('animateProgress');
}

function displayResults() {

    const chartsContainer = document.getElementById('yourData');
    chartsContainer.style.display = 'block';
    const dataContainer = document.getElementById('submitData');
    dataContainer.style.display = 'block';

    setTimeout(() => {
    
        const spinner = document.getElementById('spinner');
        const spinnerTrolley = document.getElementById('spinnerTrolley');
        spinner.style.display = 'none';
        spinner.classList.remove('d-flex'); // Remove d-flex when hiding the spinner
        spinnerTrolley.classList.remove('animateProgress');

        AOS.init({        
            // Global settings:
            disable: false, // accepts following values: 'phone', 'tablet', 'mobile', boolean, expression or function
            initClassName: 'aos-init', // class applied after initialization
            animatedClassName: 'aos-animate', // class applied on animation
            useClassNames: false, // if true, will add content of `data-aos` as classes on scroll
            disableMutationObserver: false, // disables automatic mutations' detections (advanced)
            //debounceDelay: 50, // the delay on debounce used while resizing window (advanced)
            //throttleDelay: 99, // the delay on throttle used while scrolling the page (advanced)
        
        
            // Settings that can be overridden on per-element basis, by `data-aos-*` attributes:
            offset: 0, // offset (in px) from the original trigger point
            delay: 0, // values from 0 to 3000, with step 50ms
            duration: 1200, // values from 0 to 3000, with step 50ms
            easing: 'ease', // default easing for AOS animations
            once: true, // whether animation should happen only once - while scrolling down
            mirror: false // whether elements should animate out while scrolling past them
        });
    }, 2000); 


}






function displayInvalidFile() {
	const section = document.getElementById('errorFile');
	section.style.display = 'block'; 
	const upload = document.getElementById('useAirplaneMode');
	upload.style.display = 'none'; 
	
}

  


function displayPurchaseData() {

    ////TOTALS

    // earliest purchase date
    const earliestDate = getEarliestPurchaseDate(purchases);
    displayData(formatPrettyDate(earliestDate),'earliestDate');				

    // latest purchase date
    const latestDate = getLatestPurchaseDate(purchases);
    displayData(formatPrettyDate(latestDate),'latestDate');	

    //clubcard duration
    const dataDuration = getTimeBetween(earliestDate,latestDate);
    displayData(dataDuration.years,'durationYears');
    displayData(dataDuration.months,'durationMonths');
    displayData(dataDuration.days,'durationDays');	
    
    // total spent
    const totalSpent = getTotalAmountSpent(purchases);
    displayData(formatValue(totalSpent),'totalSpent');				

    // total saved
    const totalSaved = getTotalAmountSaved(purchases);
    displayData(totalSaved,'totalSaved');	
      
    // number transactions
    const countTransactions = purchases.length;
    displayData(countTransactions,'totalTransactions');		


    //products purchased

    //Total Items
    const totalItems = getCountItems(purchases);
    displayData(totalItems,'totalItems');	

    //stores visited
    const InstoresCounts = getCountInstores();
    displayData(InstoresCounts,'InstoresCounts');	


    //// ----------- AVERAGES ------------

    //average spend
    const averageSpend = getAverageSpend(totalSpent,countTransactions);
    displayData(averageSpend,'averageSpend');	

    //Average Weekly spend
    const averageWeeklySpend = calculateAverageSpentPerWeek(earliestDate, latestDate, totalSpent);
    displayData(averageWeeklySpend,'averageWeeklySpend');

    // frequency (every x days)
    const purchaseFrequency = getFrequency(earliestDate, latestDate, countTransactions) 
    displayData(purchaseFrequency,'frequency');	

    //Average Items
    const averageItems = (totalItems/countTransactions).toFixed(1);
    displayData(averageItems,'averageItems');


    //// ----------- OUTLIERS ------------

    //mostExpensiveShop
    const mostExpensiveShop = getMostExpensiveShop(purchases);
    displayData(formatPrettyDate(mostExpensiveShop.date),'expensiveShopDate');
    displayData(mostExpensiveShop.storeName,'expensiveShopStore');
    displayData(mostExpensiveShop.netBasketValue,'expensiveShopAmount');

    //biggestShop
    const biggestShop = getBiggestShop(purchases);
    displayData(formatPrettyDate(biggestShop.date),'biggestShopDate');
    displayData(biggestShop.storeName,'biggestShopStore');
    displayData(biggestShop.numberOfItems,'biggestShopItems');
    
    if (purchases.length > 1)  
    {

        //longestGap
        const purchaseGaps = getGapBetweenPurchases(purchases);
        displayData(purchaseGaps.longestDays,'longestGapDays');
        displayData(formatPrettyDate(purchaseGaps.longestStartDate),'longestGapStart');
        displayData(formatPrettyDate(purchaseGaps.longestEndDate),'longestGapEnd');

    }



    //// ----------- CHARTS and TABLES ------------
    
    //stores
    drawStoresWithCounts(purchases);
    
    //days of week
    showPurchasesByDays('daysOfTheWeek');
    
    //all shops
    createScatterChart('purchasesScatterChart');	




}

function displayProductData() {

    // number products
    const countProducts = aggregatedProducts.length;
    displayData(countProducts,'totalProducts');	
    

    // Initial call to populate the product list on page load
    updateTopProducts(3,'quantity-high','topQuanitityProductsTable');
    updateTopProducts(3,'total-spent-high','topSpendProductsTable');
    updateTopProducts(3,'max-price-high','topPriceProductsTable');

}





function displayWeeklyProductData() {
 				
    createWeeklyChart(weeklyPurchases, 'weeklyBarChart');

}



function displayData(data,element) {
	const outputElement = document.getElementById(element);
	
    if (element) {
		outputElement.innerHTML = `${data}`;

    } else {
        console.error('Element not found with id:', element);
    }	

}






function createProgressBar(barId, barClass, percentage) {
    const progress = document.createElement('div');
    progress.className = 'progress progress-thick';

    const progressBar = document.createElement('div');
    progressBar.className = `progress-bar ${barClass}`;
    progressBar.id = barId;
    progressBar.setAttribute('role', 'progressbar');
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');

    progress.appendChild(progressBar);

    return progress;
}


function showPurchasesByDays(parentContainerId) {
					
	const allDaysSpend = getTotalSpentAndPercentageForAllDays(purchases);
	const allDaysTransactions = getTotalTransactionsAndPercentageForAllDays(purchases);

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const parentContainer = document.getElementById(parentContainerId);


    // Clear previous content
    parentContainer.innerHTML = '';

    daysOfWeek.forEach(day => {
        // Create the progress group container
        const progressGroup = document.createElement('div');
        progressGroup.className = 'progress-group mb-4';

        // Create the header
        const header = document.createElement('div');
        header.className = 'progress-group-header d-flex justify-content-between';

        const dayName = document.createElement('div');
        dayName.textContent = day;
        header.appendChild(dayName);

        const spendValue = document.createElement('div');
        spendValue.className = 'ms-auto fw-semibold me-2 text-info';
        spendValue.id = `${day}SpendValue`;
        spendValue.textContent = allDaysSpend[day].totalOnDay; // Update with actual value
        header.appendChild(spendValue);

        const transactionsText = document.createElement('div');
        transactionsText.className = 'fw-semibold text-danger';
        transactionsText.innerHTML = `(${allDaysTransactions[day].totalOnDay} times)`;
        header.appendChild(transactionsText);

        progressGroup.appendChild(header);

        // Create the progress bars container
        const progressGroupBars = document.createElement('div');
        progressGroupBars.className = 'progress-group-bars';

        // Spend progress bar
        const spendProgressBar = createProgressBar(`${day}SpendBar`, 'bg-info', allDaysSpend[day].percentageOfTotal);
        progressGroupBars.appendChild(spendProgressBar);

        // Transactions progress bar (assuming another percentage value exists for transactions)
        const transactionsProgressBar = createProgressBar(`${day}TransactionsBar`, 'bg-danger', allDaysTransactions[day].percentageOfTotal); // Update '50' with actual percentage value
        progressGroupBars.appendChild(transactionsProgressBar);

        progressGroup.appendChild(progressGroupBars);

        // Append the progress group to the parent container
        parentContainer.appendChild(progressGroup);
    });
}



function listProducts(topProducts,element) {
    
    const container = document.getElementById(element); // Get the container

    container.innerHTML = ''; // Clear previous content

    // Create a row to hold the cards, making it a flex container to ensure equal height columns
    const row = document.createElement('div');
    row.className = 'row d-flex flex-row';

    topProducts.forEach((product, index) => {
        const cleanedProductName = makeStringNameSafe(product.name);

        // Create a column for each card
        const col = document.createElement('div');
        col.className = 'col-sm-12 mb-4 d-flex';

        // Create the card
        const card = document.createElement('div');
        card.className = 'card text-white bg-dark w-100';

        // Create the card body
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body pb-0 d-flex flex-column';

        // Create the container for quantity and price, with flexbox to space them out
        const productInfo = document.createElement('div');
        productInfo.className = 'd-flex justify-content-between fs-3 fw-semibold';
        productInfo.innerHTML = `<div>${product.totalQuantity} of</div> <div>Total £${product.totalPrice.toFixed(2)}</div>`;

        // Append the quantity and price container to the card body
        cardBody.appendChild(productInfo);

        // Create a separate div for the product name and append it below the quantity and price
        const productName = document.createElement('div');
        productName.className = 'mt-2 fs-1'; // Add top margin for spacing
        productName.textContent = product.name;

        // Append the product name to the card body
        cardBody.appendChild(productName);

        card.appendChild(cardBody);

        // Only create and append chart elements if totalQuantity is greater than 1
        if (product.totalQuantity > 1) {
            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'c-chart-wrapper mt-3 mx-3';
            chartWrapper.style.height = '70px';
            const chartCanvas = document.createElement('canvas');
            chartCanvas.className = 'chart';
            chartCanvas.id = `card-chart-${element}-${cleanedProductName}-${index}`;
            chartCanvas.height = '70';
            chartCanvas.width = '272';
            chartWrapper.appendChild(chartCanvas);

            card.appendChild(chartWrapper);

            // Defer chart initialization to ensure canvas is ready
            setTimeout(() => {
                const chartConfig = createPriceChart(cleanedProductName); // Ensure this function exists and generates the right config
                new Chart(document.getElementById(`card-chart-${element}-${cleanedProductName}-${index}`), chartConfig);
            }, 0);
        }

        // Create the card footer for pricing information
        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer fs-3 pb-2 d-flex justify-content-between';
        cardFooter.innerHTML = `<div>Range £${product.minPrice.toFixed(2)} to £${product.maxPrice.toFixed(2)}</div><div><strong>Average £${product.averagePrice.toFixed(2)}</strong></div>`;

        card.appendChild(cardFooter);

        // Add the card to the column, and the column to the row
        col.appendChild(card);
        row.appendChild(col);
    });

    // Add the row to the container
    container.appendChild(row);
}




function updateTopProducts(numRecords,sortOrder,element) {
    // Get the selected number of records and sort order from the dropdowns

    // Call getTopProducts with the selected values
    const topProducts = getTopProducts(parseInt(numRecords, 10), sortOrder);
    
    // Clear the current product list
    const container = document.getElementById(element);
    container.innerHTML = '';

    // Call listProducts to redraw the product cards with the new top products
    listProducts(topProducts,element);

}


async function downloadCSV(filename) {

    let arrayPromise;

    switch (filename) {
        case 'rawPurchases.csv':
            arrayPromise = Promise.resolve(getRawPurchasesData());
            break;
        case 'rawProducts.csv':
            arrayPromise = Promise.resolve(getRawProductsData());
            break;
        case 'anonPurchases.csv':
            arrayPromise = getAnonPurchasesData();
            break;
        case 'anonProducts.csv':
            arrayPromise = getAnonProductsData();
            break;
        case 'anonWeekly.csv':
            arrayPromise = Promise.resolve(getAnonPurchasesByWeek());
            break;
        default:
            arrayPromise = Promise.resolve([]);
    }

    arrayPromise.then(array => {
        // Step 1: Convert array to CSV string
        // Convert the array to a CSV string
        const csvHeader = Object.keys(array[0]).join(',') + '\n';
        const csvRows = array.map(row => 
            Object.values(row).map(field => 
                `"${String(field).replace(/"/g, '""')}"` // Escape double quotes
            ).join(',')
        ).join('\n');
        const csvData = csvHeader + csvRows;

        // Step 2: Create a Blob with the CSV content and the type of file
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });

        // Step 3: Create a link and set its href to the URL created from the Blob
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);

        // Step 4: Append the link to the document and trigger the download
        document.body.appendChild(link); // Required for Firefox
        link.click(); // Programmatically click the link to trigger the download

        // Clean up by revoking the Blob URL and removing the link after a small delay
        setTimeout(() => {
            URL.revokeObjectURL(url);
            link.remove();
        }, 100); // Timeout to ensure revoking and removal after download
    }).catch(error => {
        console.error('Error downloading the CSV file:', error);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const myModal = document.getElementById('myModal')

    myModal.addEventListener('show.coreui.modal', event => {
        // Button that triggered the modal
        const button = event.relatedTarget;
    
        // Extract info from data-coreui-* attributes
        const modalTitleContent = button.getAttribute('data-coreui-title');
        const contentFile = button.getAttribute('data-coreui-content');
        const footerFile = button.getAttribute('data-coreui-footer');
    
        // Set the content of #myModalLabel
        const modalTitle = myModal.querySelector('#myModalLabel');
        if (modalTitle) {
            modalTitle.textContent = modalTitleContent;
        }

        // Load the main content
        fetch(contentFile)
        .then(response => {
            if (!response.ok) throw new Error(`Error loading modal content from ${contentFile}`);
            return response.text();
        })
        .then(contentHtml => {
            myModal.querySelector('#myModalBody').innerHTML = contentHtml;
    
            // If a footer content file is specified, load and append it to the footer
            if (footerFile) {
            fetch(footerFile)
                .then(response => {
                if (!response.ok) throw new Error(`Error loading footer content from ${footerFile}`);
                return response.text();
                })
                .then(footerHtml => {
                    myModal.querySelector('#myModalFooterButtons').innerHTML = footerHtml;
                });
            }
        })
        .catch(error => {
            console.error('Error loading content:', error);
            myModal.querySelector('#myModalBody').innerHTML = '<p>Sorry, the content could not be loaded. If you enabled Airplane mode, you will need to disable it to view this content.</p>';
        });
    });
});

  
