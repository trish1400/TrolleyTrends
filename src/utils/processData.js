import { findStoreInfo, getColor, mapPurchaseType, secureHash, generateRandomOffset, generateGUID, formatSQLDate, shiftValue} from './helpers.js';
import { displayInProgress, displayResults, displayInvalidFile, displayPurchaseData, displayProductData, displayWeeklyProductData} from './display.js';
import { dataStore } from './dataStore.js';

export async function handleFileInputChange(event) {
    const file = event.target.files[0];

    if (file) {
        try {
            const jsonData = await readFileAsJson(file);

            if (validateJsonSchema(jsonData)) {
                processJsonData(jsonData);
                displayInProgress();
            } else {
                console.error("Error processing the file");
                displayInvalidFile();
            };
            dataStore.updateData('jsonData', jsonData);

        } catch (error) {
            console.error("Error processing the file", error);
            displayInvalidFile();
        }
    }
}

async function readFileAsJson(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = JSON.parse(e.target.result);
                resolve(result);
            } catch (parseError) {
                reject(new Error("Invalid JSON format."));
            }
        };
        reader.onerror = (e) => reject(new Error("File read error."));
        reader.readAsText(file);
    });
}

// Validation function
function validateJsonSchema(jsonData) {
    // Check if 'Purchase' exists and is an array
    if (Array.isArray(jsonData['Purchase'])) {
        // Check if the first element of 'Purchase' is also an array (nested structure)
        return jsonData['Purchase'].every(purchaseArray => Array.isArray(purchaseArray));
    }
    return false; // Returns false if 'Purchase' is not an array or does not exist
}


async function processJsonData(jsonData) {

    try {

        const storeNames = await processStoreNames(jsonData); // Store the returned value
        dataStore.updateData('storeNames', storeNames);

        // Concurrently run getPurchasesData and getProductsData and assign their results
        const [purchases, products] = await Promise.all([getPurchasesData(), getProductsData()]);
        dataStore.updateData('purchases', purchases);
        dataStore.updateData('products', products);

        displayPurchaseData(purchases);


        // Now that getPurchasesData has completed, process and display purchase data
        const weeklyPurchases = await aggregatePurchasesByWeek(purchases);
        dataStore.updateData('weeklyPurchases', weeklyPurchases);

        // Now that getProductsData has completed, process and display product data
        const aggregatedProducts = await getAggregatedProductData(products);
        dataStore.updateData('aggregatedProducts', aggregatedProducts);

        displayProductData(aggregatedProducts, products);
        displayWeeklyProductData(weeklyPurchases); // Further processing/displaying, details depend on implementation
        displayResults();

    } catch (error) {
        console.error("An error occurred in processing JSON data:", error);
    }
}




function processStoreNames(jsonData) {
    return new Promise((resolve, reject) => {
        try {
            const storeInfoMap = {};
            let colorIndex = 0;

            jsonData['Purchase'].forEach(purchase => {
                purchase.forEach(record => {
                    const storeId = record.storeId.toString();
                    const storeName = record.storeName;
                    const storeFormat = record.storeFormat;

                    if (storeFormat === 'NA' && (storeName.includes('GHS') || storeName.includes('Grocery'))) {
                        return; // Skip this iteration
                    }

                    if (!storeInfoMap[storeId]) {
                        storeInfoMap[storeId] = [];
                    }

                    let formattedStoreName = storeName;
                    if (storeName === storeName.toUpperCase()) {
                        formattedStoreName = storeName.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    }

                    const storeInfo = { storeName: formattedStoreName, storeFormat };
                    const isStoreInfoPresent = storeInfoMap[storeId].some(info => info.storeName.toLowerCase() === formattedStoreName.toLowerCase() && info.storeFormat === storeFormat);

                    if (!isStoreInfoPresent) {
                        storeInfoMap[storeId].push(storeInfo);
                    }
                });
            });

            if (!storeInfoMap['9999']) {
                storeInfoMap['9999'] = [{ storeName: 'Home Delivery', storeFormat: 'Delivery' }];
            }

            const storeNames = Object.keys(storeInfoMap).map(storeId => {
                const preferredInfo = storeInfoMap[storeId].find(info => info.storeName !== info.storeName.toUpperCase()) || storeInfoMap[storeId][0];
                const color = preferredInfo.storeFormat === 'Delivery' ? '#332288' : getColor(colorIndex++);
                return { storeId, storeName: preferredInfo.storeName, storeFormat: preferredInfo.storeFormat, color };
            });

            resolve(storeNames); // Resolve with storeNames directly
        } catch (error) {
            reject(error); // Properly handle and report errors
        }
    });
}



function getOutcode() {

    const jsonData = dataStore.getData('jsonData');

    const postcode = jsonData["Customer Profile And Contact Data"]["Clubcard Accounts"]["postal address"]["postcode"] || "XX0 0XX";

    if (!postcode) return ''; // Return an empty string if no postcode is provided

    const spaceIndex = postcode.indexOf(' '); // Find the index of the space character

    if (spaceIndex !== -1) {
        // If there is a space, return everything before it
        return postcode.substring(0, spaceIndex);
    } else {
        // If there is no space, decide based on the total length of the postcode
        if (postcode.length === 6) {
            return postcode.substring(0, 3); // Return the first 3 characters for a 6-character postcode
        } else if (postcode.length === 7) {
            return postcode.substring(0, 4); // Return the first 4 characters for a 7-character postcode
        } else {
            // For any other length, grab the first 4 chars
            return postcode.substring(0, 4); 
        }
    }
}


export function getRawPurchasesData() {

    const jsonData = dataStore.getData('jsonData');

    // Processing to get 'purchases'
    const purchases = jsonData['Purchase'].flatMap(purchase =>
        purchase.map(record => {
            // Ensure 'record.product' is an array and has elements before using '.reduce()'
            const totalItems = Array.isArray(record.product) && record.product.length > 0 ? 
                record.product.reduce((total, product) => {
                    // Add the product quantity to the total, treating null quantities as 1
                    return total + (product.quantity === null ? 1 : parseInt(product.quantity, 10));
                }, 0) // Start with a total of 0
                : 0; // Fallback to 0 if 'record.product' is not an array or is empty

            // Ensure storeId is treated as a string for consistency
            let storeId = record.storeId.toString();

            return {
                timeStamp: record.timeStamp,
                storeId: storeId,
                storeName: record.storeName,
                storeFormat: record.storeFormat,
                purchaseType: record.purchaseType,
                basketValueGross: parseFloat(record.basketValueGross),
                basketValueNet: parseFloat(record.basketValueNet),
                overallBasketSavings: record.overallBasketSavings === 'NA' ? 0 : parseFloat(record.overallBasketSavings),
                totalItems // Add the total number of items to the purchase object
            };
        })
    );

    return purchases; // Return the array of purchases directly
}




export function getRawProductsData() {

    const jsonData = dataStore.getData('jsonData');

    // Process and return the products data
    const products = jsonData['Purchase'].flatMap(purchase =>
        purchase.flatMap(record => {
            // Ensure storeId is treated as a string for consistency
            let storeId = record.storeId.toString();
            // Process products within the record
            return record.product.map(product => ({
                name: product.name,
                quantity: product.quantity,
                price: Math.abs(parseFloat(product.price)),
                weightInGrams: product.weightInGrams,
                volumeInLitres: product.volumeInLitres,
                purchaseType: product.channel,
                storeId: storeId,
                storeName: record.storeName,
                timeStamp: record.timeStamp,
                storeFormat: record.storeFormat,
            }));
        })
    );

    return products; // Return the array of products directly
}


async function getPurchasesData() {

    try {
        const purchases = getRawPurchasesData().map(purchase => {
            const date = new Date(purchase.timeStamp);
            let storeId = purchase.storeId;
            if (mapPurchaseType(purchase.purchaseType) === 'Delivery') {
                storeId = '9999'; // Special case handling
            }
            const storeInfo = findStoreInfo(storeId) || {};
            return {
                date,
                storeName: storeInfo.storeName || 'Unknown',
                storeId,
                storeFormat: storeInfo.storeFormat || 'Unknown',
                purchaseType: mapPurchaseType(purchase.purchaseType),
                basketValueGross: parseFloat(purchase.basketValueGross),
                basketValueNet: parseFloat(purchase.basketValueNet),
                overallBasketSavings: purchase.overallBasketSavings === 'NA' ? 0 : parseFloat(purchase.overallBasketSavings),
                totalItems: purchase.totalItems
            };
        });
        return purchases; // Return the processed data
    } catch (error) {
        console.error("Error processing purchase data: ", error);
        throw error; // Re-throw the error if you need to handle it further up the chain
    }
}



async function getProductsData() {
    try {
        const products = getRawProductsData()
            .filter(product =>
                !product.name.match(/SUBSTITUTION.*REFUND/i) && // Excludes products labeled as substitutions and refunds
                parseFloat(product.price) !== 0.0 // Excludes products priced at zero
            )
            .map(product => {
                let storeId = product.storeId.toString();
                if (mapPurchaseType(product.purchaseType) === 'Delivery') {
                    storeId = '9999'; // Special store ID for delivery type
                }
                const storeInfo = findStoreInfo(storeId) || {};
                return {
                    name: product.name,
                    quantity: product.quantity === null ? 1 : product.quantity,
                    price: Math.abs(parseFloat(product.price)),
                    purchaseType: mapPurchaseType(product.purchaseType),
                    storeId: storeId,
                    storeName: storeInfo.storeName || 'Unknown',
                    date: new Date(product.timeStamp),
                    storeFormat: storeInfo.storeFormat || 'Unknown'
                };
            });
        return products; // Return the processed data
    } catch (error) {
        console.error("Error processing product data: ", error);
        throw error; // Re-throw the error if you need to handle it further up the chain
    }
}


async function getAggregatedProductData() {

    const products = dataStore.getData('products');

    try {
        const aggregatedProducts = {};
        products.forEach(product => {
            const name = product.name;
            if (!aggregatedProducts[name]) {
                aggregatedProducts[name] = {
                    name: name,
                    productType: product.productType,
                    totalQuantity: 0,
                    minPrice: Infinity,
                    maxPrice: -Infinity,
                    totalPrice: 0
                };
            }
            const quantity = product.quantity === null ? 1 : parseInt(product.quantity, 10);
            const price = parseFloat(product.price);
            aggregatedProducts[name].totalQuantity += quantity;
            aggregatedProducts[name].minPrice = Math.min(aggregatedProducts[name].minPrice, price);
            aggregatedProducts[name].maxPrice = Math.max(aggregatedProducts[name].maxPrice, price);
            aggregatedProducts[name].totalPrice += price * quantity; // Total price for average calculation
        });
        const result = Object.values(aggregatedProducts).map(product => ({
            ...product,
            averagePrice: product.totalQuantity > 0 ? product.totalPrice / product.totalQuantity : 0
        }));
        return result; // Return the aggregated product data
    } catch (error) {
        console.error("Error aggregating product data: ", error);
        throw error;
    }
}



function getWeekCommencing(date) {
    const dateCopy = new Date(date.getTime());
    dateCopy.setHours(12, 0, 0, 0); // Avoid DST issues by setting to noon

    const day = dateCopy.getDay() || 7; // Sunday becomes 7
    dateCopy.setDate(dateCopy.getDate() - (day - 1)); // Adjust to previous Monday

    // Format the date in YYYY-MM-DD without converting to UTC
    const year = dateCopy.getFullYear();
    const month = String(dateCopy.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const dayOfMonth = String(dateCopy.getDate()).padStart(2, '0');

    return `${year}-${month}-${dayOfMonth}`;
}



async function aggregatePurchasesByWeek() {

    const purchases = dataStore.getData('purchases');


    try {
        const weeklyData = {}; // Object for key-based access
        
        purchases.forEach(purchase => {
            const weekCommencing = getWeekCommencing(new Date(purchase.date));
            const storeFormat = purchase.purchaseType === "Delivery" ? "Delivery" : purchase.storeFormat;
            const key = `${weekCommencing}|${storeFormat}|${purchase.purchaseType}`;
            
            if (!weeklyData[key]) {
                weeklyData[key] = {
                    weekCommencing,
                    storeFormat,
                    purchaseType: purchase.purchaseType,
                    basketValueGross: 0,
                    basketValueNet: 0,
                    overallBasketSavings: 0,
                    totalItems: 0
                };
            }
            
            // Helper function to round numbers to two decimal places
            const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
            
            // Aggregate and round data to avoid floating-point precision issues
            weeklyData[key].basketValueGross = round(weeklyData[key].basketValueGross + purchase.basketValueGross);
            weeklyData[key].basketValueNet = round(weeklyData[key].basketValueNet + purchase.basketValueNet);
            weeklyData[key].overallBasketSavings = round(weeklyData[key].overallBasketSavings + purchase.overallBasketSavings);
            weeklyData[key].totalItems += purchase.totalItems;
        });

        // Convert the object to an array and handle date conversion
        const weeklyPurchases = Object.values(weeklyData).map(item => ({
            ...item,
            weekCommencing: new Date(item.weekCommencing) // Ensure dates are Date objects
        }));

        // Sort the data by weekCommencing date
        weeklyPurchases.sort((a, b) => a.weekCommencing - b.weekCommencing);

        return weeklyPurchases; // Return the processed data
    } catch (error) {
        console.error("Error aggregating purchases by week: ", error);
        throw error; // Re-throw the error if further handling is needed upstream
    }
}





export function getAnonPurchasesByWeek() {

    const weeklyPurchases = dataStore.getData('weeklyPurchases');

    if (!Array.isArray(weeklyPurchases) || weeklyPurchases.length === 0) {
        console.error('No weekly purchases data available');
        return [];
    }

    let anonWeeklyData = [];
    let weeklyTotals = {}; // Object to hold total purchases per week

    try {
        // Determine the date range of weeklyPurchases
        const startDate = new Date(weeklyPurchases[0].weekCommencing); // Assuming weeklyPurchases is sorted
        const endDate = new Date(weeklyPurchases[weeklyPurchases.length - 1].weekCommencing);


        const guid = generateGUID();
        const outcode = getOutcode();

        // Initialize weeklyTotals for the full date range, including empty weeks
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 7)) {
            const weekCommencing = getWeekCommencing(date);

            weeklyTotals[weekCommencing] = {
                weekCommencing,
                submission: guid,
                outcode: outcode,
                totalBasketValueGross: 0,
                totalBasketValueNet: 0,
                totalOverallBasketSavings: 0,
                totalItems: 0
            };
        }

        // Aggregate data for weeks with purchases
        weeklyPurchases.forEach(data => {
            const weekCommencing = getWeekCommencing(data.weekCommencing);

            // Sum up the totals for each week
            weeklyTotals[weekCommencing].totalBasketValueGross += data.basketValueGross;
            weeklyTotals[weekCommencing].totalBasketValueNet += data.basketValueNet;
            weeklyTotals[weekCommencing].totalOverallBasketSavings += data.overallBasketSavings;
            weeklyTotals[weekCommencing].totalItems += data.totalItems;
        });

        // Apply random offset to totalBasketValueGross and totalBasketValueNet for each week
        Object.values(weeklyTotals).forEach(weekData => {
            const valueOffset = generateRandomOffset(); // Generate a random offset for the week
            weekData.totalBasketValueGross = shiftValue(weekData.totalBasketValueGross, valueOffset);
            weekData.totalBasketValueNet = shiftValue(weekData.totalBasketValueNet, valueOffset);
        });
    } catch (error) {
        console.error(`Error processing weekly purchases data: ${error.message}`);
        // Depending on your error handling strategy, you might want to return an empty array or throw the error
        return [];
        // or throw error;
    }

    return anonWeeklyData = Object.values(weeklyTotals);
}





export async function getAnonPurchasesData() {
    const rawPurchasesData = getRawPurchasesData();

    const anonPurchasesData = await Promise.all(rawPurchasesData.map(async (purchase) => {
        try {
            const stringToHash = `${purchase.timeStamp}-${purchase.storeId}-${purchase.basketValueNet}-${purchase.overallBasketSavings}-${purchase.totalItems}`;
            const uniqueIdentifier = await secureHash(stringToHash).catch(e => {
                throw new Error(`Error in secureHash for purchase on ${purchase.timeStamp} at store ${purchase.storeId}: ${e.message}`);
            });
            
            const timeStampDate = new Date(purchase.timeStamp);
            const dateWithoutTime = new Date(timeStampDate.getFullYear(), timeStampDate.getMonth(), timeStampDate.getDate());
            const totalItems = purchase.totalItems;
            const valueOffset = generateRandomOffset();

            return {
                date: formatSQLDate(dateWithoutTime),
                storeName: purchase.storeName,
                storeId: purchase.storeId,
                storeFormat: purchase.storeFormat,
                purchaseType: mapPurchaseType(purchase.purchaseType),
                basketValueGross: shiftValue(purchase.basketValueGross,valueOffset),
                basketValueNet: shiftValue(purchase.basketValueNet,valueOffset),
                overallBasketSavings: purchase.overallBasketSavings === 'NA' ? 0 : parseFloat(purchase.overallBasketSavings),
                totalItems: totalItems,
                hash: uniqueIdentifier
            };
        } catch (e) {
            console.error(`Error processing purchase on ${purchase.timeStamp} at store ${purchase.storeId}: ${e.message}`);
            // Return null and filter out later
            return null;
        }
    }));

    // Filter out any nulls if you chose to return null on error
    return anonPurchasesData.filter(purchase => purchase !== null);
}


export async function getAnonProductsData() {
    const rawProductsData = getRawProductsData();

    const anonProductsData = await Promise.all(rawProductsData.map(async (product) => {
        try {
            // Create a new Date object from the timeStamp
            const timeStampDate = new Date(product.timeStamp);

            // Create a new Date object with the time removed (set to 00:00:00)
            const dateWithoutTime = new Date(timeStampDate.getFullYear(), timeStampDate.getMonth(), timeStampDate.getDate());

            const price = Math.abs(parseFloat(product.price));

            const stringToHash = `${dateWithoutTime}-${product.name}-${price}-${product.storeId}`;
            const uniqueIdentifier = await secureHash(stringToHash).catch(e => {
                throw new Error(`Error in secureHash for product ${product.name}: ${e.message}`);
            });

            return {
                date: formatSQLDate(dateWithoutTime),
                name: product.name,
                price: price,
                storeId: product.storeId,
                storeName: product.storeName,
                storeFormat: product.storeFormat,
                hash: uniqueIdentifier
            };
        } catch (e) {
            console.error(`Error processing product ${product.name}: ${e.message}`);
            // Return null and filter out later
            return null;
        }
    }));

    // Option 1: Filter out any nulls if you chose to return null on error
    return anonProductsData.filter(product => product !== null);
}


export function getEarliestPurchaseDate(purchases) {
    if (purchases.length === 0) {
        return null; // or a suitable default value or message
    }

    // Use the Array.reduce method to find the earliest date
    const earliestDate = purchases.reduce((earliest, current) => {
        const currentDate = new Date(current.date);
        return earliest < currentDate ? earliest : currentDate;
    }, new Date(purchases[0].date)); // Initialize with the first purchase's date

    return earliestDate;

}

export function getLatestPurchaseDate(purchases) {
    if (purchases.length === 0) {
        return null; // or a suitable default value or message
    }

    // Use the Array.reduce method to find the latest date
    const latestDate = purchases.reduce((latest, current) => {
        const currentDate = new Date(current.date);
        return latest > currentDate ? latest : currentDate;
    }, new Date(purchases[0].date)); // Initialize with the first purchase's date as a Date object

    return latestDate;
}



export function getTotalAmountSpent(purchases) {
    // Initialize total amount spent
    let totalAmountSpent = 0;

    // Iterate through each purchase and add the basketValueNet to the total
    purchases.forEach(purchase => {
        totalAmountSpent += parseFloat(purchase.basketValueNet);
    });

    // Format the total amount spent as GBP
    return totalAmountSpent;
}

export function getCountItems(purchases) {
    // Initialize total amount spent
    let totalCountItems = 0;

    purchases.forEach(purchase => {
        totalCountItems += purchase.totalItems;
    });
	
    return totalCountItems
}


export function getAverageSpend(totalSpent, countTransactions) {

    const numericTotalSpent = totalSpent;
    const averageSpend = (numericTotalSpent / countTransactions).toFixed(2);
		
    // Format the total amount spent as GBP
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2
    }).format(averageSpend);	
	
}

export function calculateAverageSpentPerWeek(startDate, endDate, totalSpent) {
    // Parse the start and end dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate the difference in milliseconds between the start and end dates
    const differenceInMilliseconds = end - start;

    // Convert the difference to days and then to weeks
    let weeks = differenceInMilliseconds / (1000 * 60 * 60 * 24 * 7);


    //if there is only one purchase
    if (weeks == 0){
        weeks = 1;
    }

    // Calculate the average spent per week
    const averageSpentPerWeek = totalSpent / weeks;

    // Return the average spent per week, ensuring at least 1 week to avoid division by zero
    return `£${averageSpentPerWeek.toFixed(2)}`;
}


export function getTotalAmountSaved(purchases) {
    // Initialize total amount saved
    let totalAmountSaved = 0;

    // Iterate through each purchase and add the overallBasketSavings to the total
    purchases.forEach(purchase => {
        totalAmountSaved += parseFloat(purchase.overallBasketSavings);
    });

    // Format the total amount spent as GBP
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2
    }).format(totalAmountSaved);
}


export function getCountInstores(purchases){

    const distinctStoreIdsCount = purchases.reduce((acc, purchase) => {
        if (purchase.purchaseType !== 'Delivery') {
          acc.add(purchase.storeId);
        }
        return acc;
      }, new Set()).size;

    return distinctStoreIdsCount;

}


export function getTopProducts(number, sortParam) {

    const aggregatedProducts = dataStore.getData('aggregatedProducts');

    let sortedResult;

    switch (sortParam) {
        case 'quantity-high':
            sortedResult = aggregatedProducts.sort((a, b) => b.totalQuantity - a.totalQuantity);
            break;
        case 'quantity-low':
            sortedResult = aggregatedProducts.sort((a, b) => a.totalQuantity - b.totalQuantity);
            break;
        case 'total-spent-high':
            sortedResult = aggregatedProducts.sort((a, b) => b.totalPrice - a.totalPrice);
            break;
        case 'total-spent-low':
            sortedResult = aggregatedProducts.sort((a, b) => a.totalPrice - b.totalPrice);
            break;
        case 'average-price-high':
            sortedResult = aggregatedProducts.sort((a, b) => (b.averagePrice - a.averagePrice ));
            break;
        case 'average-price-low':
            sortedResult = aggregatedProducts.sort((a, b) => (a.averagePrice - b.averagePrice ));
            break;
        case 'max-price-high':
            sortedResult = aggregatedProducts.sort((a, b) => (b.maxPrice - a.maxPrice ));
            break;
        case 'max-price-low':
            sortedResult = aggregatedProducts.sort((a, b) => (a.maxPrice - b.maxPrice ));
            break;
        default:
            // Default to 'quantity (high)' if no valid sortParam provided
            sortedResult = aggregatedProducts.sort((a, b) => b.totalQuantity - a.totalQuantity);
    }

    return sortedResult.slice(0, number);
}





export function getFrequency(earliestDate, latestDate, countTransactions) {
    const date1 = new Date(earliestDate);
    const date2 = new Date(latestDate);

    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

    const frequency = (diffDays / countTransactions).toFixed(1);

    return frequency;
}

export function getMostExpensiveShop(purchases) {
    if (!purchases || purchases.length === 0) {
        return null; // Return null if purchases list is empty or not provided
    }

    // Sort transactions by net basket value in descending order
    const sortedPurchases = purchases.sort((a, b) => b.basketValueNet - a.basketValueNet);

    // The first element is now the most expensive purchase
    const mostExpensive = sortedPurchases[0];


    // Format the total amount spent as GBP
    const formattedValue = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2
    }).format(mostExpensive.basketValueNet);

    // Extract and return the desired details of the most expensive purchase
    return {
        date: mostExpensive.date,
		storeName: mostExpensive.storeName,
        numberOfItems: mostExpensive.totalItems,
        netBasketValue: formattedValue
    };
}

export function getBiggestShop(purchases) {
    if (!purchases || purchases.length === 0) {
        return null; // Return null if purchases list is empty or not provided
    }

    // Sort transactions by number of items in descending order
    const sortedPurchases = purchases.sort((a, b) => b.totalItems - a.totalItems);

    // The first element is now the purchase with the most items
    const biggest = sortedPurchases[0];

    // Format the total amount spent as GBP
    const formattedValue = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2
    }).format(biggest.basketValueNet);

    // Extract and return the desired details of the most expensive purchase
    return {
        date: biggest.date,
		storeName: biggest.storeName,
        numberOfItems: biggest.totalItems,
        netBasketValue: formattedValue
    };
}

export function getTimeBetween(startDate, endDate) {
    // Ensure dates are parsed
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Invalid dates provided.';
    }

    // Ensure start is before end
    if (start > end) {
        return 'Start date must be before end date.';
    }

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    // Adjust months and years for the calendar calculation
    if (days < 0) {
        // Borrow from months
        const endMonthStart = new Date(end.getFullYear(), end.getMonth(), 1);
        const previousMonthEnd = new Date(endMonthStart - 1); // Day before the 1st of end month
        days += previousMonthEnd.getDate(); // Add days from end of previous month
        months--; // Subtract a month as we borrowed days from the previous month
    }

    if (months < 0) {
        // Borrow from years
        months += 12; // Add months from a year
        years--; // Subtract a year as we borrowed months from the previous year
    }

    return {
        years: years,
        months: months,
        days: days
    };
}



export function getGapBetweenPurchases(purchases) {

    // Sort purchases by date
    const sortedPurchases = purchases.sort((a, b) => new Date(a.date) - new Date(b.date));

    //defaults in case there is only one purchase
    let maxGap = 0;
    let gapStart = new Date(sortedPurchases[0].date).setHours(0, 0, 0, 0);
    let gapEnd = new Date(sortedPurchases[0].date).setHours(0, 0, 0, 0);
    let gaps = []; // Array to store all gaps


    for (let i = 1; i < sortedPurchases.length; i++) {
        // Use UTC dates to avoid timezone issues
        const previousPurchaseDate = new Date(sortedPurchases[i - 1].date).setHours(0, 0, 0, 0);
        const currentPurchaseDate = new Date(sortedPurchases[i].date).setHours(0, 0, 0, 0);
        const gap = Math.round((currentPurchaseDate - previousPurchaseDate) / (1000 * 60 * 60 * 24)); // Calculate whole gap in days
        gaps.push(gap); // Add gap to the array

        if (gap > maxGap) {
            maxGap = gap;
            gapStart = new Date(previousPurchaseDate); // Use a new Date object to avoid mutation
            gapEnd = new Date(currentPurchaseDate);
        }
    }

    return {
        longestStartDate: gapStart,
        longestEndDate: gapEnd,
        longestDays: maxGap,
    };
}





export function getTotalSpentAndPercentageForAllDays(purchases) {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const results = {};
    let totalSpentOverall = 0;

    // Currency formatter
    const currencyFormatter = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2
    });

    // Initialize results for each day of the week
    daysOfWeek.forEach(day => {
        results[day] = { totalOnDay: 0, percentageOfTotal: "0%" };
    });

    // Calculate the total spent overall and for each day
    purchases.forEach(transaction => {
        const date = new Date(transaction.date);
        const day = daysOfWeek[date.getDay()]; // Get the day name using getDay() method
        
        // Add to the total spent for the specific day
        results[day].totalOnDay += transaction.basketValueNet;

        // Add to the overall total spent
        totalSpentOverall += transaction.basketValueNet;
    });

    // Calculate the percentage for each day and format the total spent as currency
    daysOfWeek.forEach(day => {
        if (totalSpentOverall > 0) {
            const percentageOfTotal = (results[day].totalOnDay / totalSpentOverall) * 100;
            results[day].percentageOfTotal = percentageOfTotal.toFixed(0);
        }
        // Format the total spent for the day as currency
        results[day].totalOnDay = currencyFormatter.format(results[day].totalOnDay);
    });

    return results;
}

export function getTotalTransactionsAndPercentageForAllDays(purchases) {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const results = {};
    let totalTransactionsOverall = 0;


    // Initialize results for each day of the week
    daysOfWeek.forEach(day => {
        results[day] = { totalOnDay: 0, percentageOfTotal: "0%" };
    });

    // Calculate the total spent overall and for each day
    purchases.forEach(transaction => {
        const date = new Date(transaction.date);
        const day = daysOfWeek[date.getDay()]; // Get the day name using getDay() method
        
        // Increment 1 for the specific day
        results[day].totalOnDay += 1;

        // Increment 1 for overall total spent
        totalTransactionsOverall += 1;
    });

    // Calculate the percentage for each day
    daysOfWeek.forEach(day => {
        if (totalTransactionsOverall > 0) {
            const percentageOfTotal = (results[day].totalOnDay / totalTransactionsOverall) * 100;
            results[day].percentageOfTotal = percentageOfTotal.toFixed(0);
        }
    });

    return results;
}



