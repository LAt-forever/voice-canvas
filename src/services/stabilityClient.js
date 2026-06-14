export async function blobToImageBitmap(blob) {
  const bitmap = await createImageBitmap(blob);
  return bitmap;
}

export async function generatePortraitImage(prompt, apiKey, apiEndpoint, model = 'sd3-medium') {
  if (!apiKey) {
    throw new Error('Stability API key is not configured');
  }

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('model', model);
  formData.append('output_format', 'png');
  formData.append('aspect_ratio', '1:1');

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Stability API error: ${response.status} ${text.slice(0, 200)}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    const base64 = data.image || data.images?.[0];
    if (!base64) {
      throw new Error('Stability API returned no image');
    }
    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });
    return blobToImageBitmap(blob);
  }

  const blob = await response.blob();
  return blobToImageBitmap(blob);
}
