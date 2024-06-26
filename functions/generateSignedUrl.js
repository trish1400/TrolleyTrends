export async function onRequestGet(context) {

  //const { STORAGE_ACCOUNT, CONTAINER_NAME, SAS_TOKEN } = context.env;
  //console.log('basic', STORAGE_ACCOUNT, CONTAINER_NAME, SAS_TOKEN); // For debugging
  console.log('with context.env', context.env.STORAGE_ACCOUNT, context.env.CONTAINER_NAME, context.env.SAS_TOKEN); // For debugging
  //console.log('Environment Variables:', context.env);

  // Extract the blobName from the query parameters
  const url = new URL(context.request.url);
  const blobName = url.searchParams.get('blobName');

  // Construct the signed URL using environment variables and the blobName
  const signedUrl = `https://${context.env.STORAGE_ACCOUNT}.blob.core.windows.net/${context.env.CONTAINER_NAME}/${blobName}?${context.env.SAS_TOKEN}`;

  // Return the signed URL as a JSON response
  return new Response(JSON.stringify({ signedUrl }), {
      headers: { 'Content-Type': 'application/json' },
  });
}
