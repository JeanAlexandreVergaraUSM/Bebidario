export function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export async function fileToWebp(file: File, maxWidth = 1200) {
  const image = await createImageBitmap(file);
  const ratio = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * ratio);
  canvas.height = Math.round(image.height * ratio);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo preparar la imagen.');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.84),
  );

  if (!blob) {
    throw new Error('No se pudo convertir la imagen.');
  }

  return blob;
}
