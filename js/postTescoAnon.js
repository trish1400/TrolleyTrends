// Define a function to perform a fetch with retry logic
async function fetchWithRetry(url, data, contentType = 'application/json', maxRetries = 3, retryDelay = 1000) {

  // Setting up the headers for Azure Blob Storage upload
  const headers = {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': contentType // Default to 'application/json', can be overridden
  };

  // Options for the fetch request
  const options = {
      method: 'PUT', // Specify PUT method for uploading
      headers: headers,
      body: JSON.stringify(data) // Assuming the data needs to be stringified, adjust if necessary
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
          const response = await fetch(url, options);
          if (!response.ok) {
              // If the response is not ok, log the status and throw an error
              console.error(`Server responded with status ${response.status}`);
              throw new Error('Network response was not ok');
          }
          return response; // Successfully fetched within the current attempt
      } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);
          if (attempt < maxRetries - 1) {
              // Wait for retryDelay milliseconds before the next attempt
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              // Increase the delay for the next attempt
              retryDelay *= 2;
          } else {
              // Rethrow the last error after all attempts have failed
              throw error;
          }
      }
  }
}


document.addEventListener('DOMContentLoaded', function () {
  const contributeButton = document.getElementById('contributeData');
  const buttonContainer = contributeButton.parentElement;

  contributeButton.addEventListener('click', function () {
    handleButtonClick();
  });

  async function handleButtonClick() {
    // Change button to loading state
    contributeButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    contributeButton.disabled = true;

    try {
        const tescoPurchases = await getAnonPurchasesData();
        const tescoWeeklyPurchases = getAnonPurchasesByWeek(); // Synchronous, no need to await
        const tescoProducts = await getAnonProductsData();

        // Split tescoProducts into chunks of no more than 10,000 rows
        const tescoProductsChunks = splitIntoChunks(tescoProducts, 10000);
        const tescoProductsUploads = tescoProductsChunks.map((chunk, index) => {
            const chunkBlobName = `tescoProducts-${new Date().toISOString()}-${index}`;
            return fetchSignedUrl(chunkBlobName).then(signedUrl => 
                fetchWithRetry(signedUrl, chunk)
            );
        });

        // Fetch signed URLs for the other datasets
        const [tescoPurchasesUrl, tescoWeeklyPurchasesUrl] = await Promise.all([
            fetchSignedUrl('tescoPurchases-' + new Date().toISOString()),
            fetchSignedUrl('tescoWeeklyPurchases-' + new Date().toISOString())
        ]);

        // Upload the other datasets
        const otherUploads = [
            fetchWithRetry(tescoPurchasesUrl, tescoPurchases),
            fetchWithRetry(tescoWeeklyPurchasesUrl, tescoWeeklyPurchases)
        ];

        // Await all uploads to complete
        await Promise.all([...tescoProductsUploads, ...otherUploads]);

        console.log('All data uploaded successfully');
        buttonContainer.innerHTML = '<div class="fs-3 mt-2 mt-md-0">Thank you!</div>';
        showToast("<p>Data submitted successfully.</p> <p>Thank you so much!</p>", "success");
    } catch (error) {
        console.error('Error:', error);
        contributeButton.innerHTML = 'Contribute!';
        contributeButton.disabled = false;
        showToast("<p>Oh no! An error occurred.</p><p> If you're willing, please raise an issue on <a href=\"https://github.com/trish1400/TrolleyTrends/issues\" target=\"_blank\" rel=\"noopener\">GitHub</a>.</p><p>Thanks for trying!</p>", "error");
    }
}

});

async function fetchSignedUrl(blobName) {
    const response = await fetch(`/generateSignedUrl?blobName=${encodeURIComponent(blobName)}`, {
        headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch signed URL: ${response.statusText}`);
    }
    const { signedUrl } = await response.json();
    return signedUrl;
}

function splitIntoChunks(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        chunks.push(chunk);
    }
    return chunks;
}
