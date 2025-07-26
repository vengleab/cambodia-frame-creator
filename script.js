/* global Cropper */

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('upload');
  const imageEl = document.getElementById('image');
  const frameEl = document.getElementById('frame');
  const downloadBtn = document.getElementById('download');

  // Path to your PNG frame. Replace the file in assets/ with your own design.
  const FRAME_URL = './frame.png';

  let frameAspect = null; // width / height ratio of the frame
  let cropper = null;

  // Pre-load the frame to get its natural dimensions
  frameEl.src = FRAME_URL;
  frameEl.addEventListener('load', () => {
    frameAspect = frameEl.naturalWidth / frameEl.naturalHeight;
    // If a cropper already exists, update its aspect ratio to match the frame
    if (cropper) {
      cropper.setAspectRatio(frameAspect);
    }
  });

  uploadInput.addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;

    // Revoke the previous object URL if any to free memory
    if (imageEl.dataset.url) {
      URL.revokeObjectURL(imageEl.dataset.url);
    }

    const url = URL.createObjectURL(file);
    imageEl.dataset.url = url;
    imageEl.src = url;
    imageEl.style.display = 'block';

    // Destroy existing cropper instance before creating a new one
    if (cropper) {
      cropper.destroy();
    }

    cropper = new Cropper(imageEl, {
      viewMode: 1,
      aspectRatio: frameAspect || NaN, // Free ratio until frame loads
      autoCropArea: 1,
      background: false,
      responsive: true,
      dragMode: 'move',
      ready() {
        // Ensure the frame overlay matches the cropper container
        frameEl.style.display = 'block';
        adjustFrameOverlay();
        downloadBtn.disabled = false;
      },
      crop() { adjustFrameOverlay(); },
      zoom() { adjustFrameOverlay(); }
    });
  });

  // Keep the frame overlay in sync with the cropper container size
  function adjustFrameOverlay() {
    if (!cropper) return;
    const cropBox = cropper.getCropBoxData();
    frameEl.style.width = `${cropBox.width}px`;
    frameEl.style.height = `${cropBox.height}px`;
    frameEl.style.left = `${cropBox.left}px`;
    frameEl.style.top = `${cropBox.top}px`;
  }

  downloadBtn.addEventListener('click', () => {
    if (!cropper) return;

    // Target output size is the frame's natural resolution if available
    const outWidth = frameEl.naturalWidth || 1000;
    const outHeight = frameEl.naturalHeight || 1000;

    // Get the user-cropped photo as a canvas
    const photoCanvas = cropper.getCroppedCanvas({
      width: outWidth,
      height: outHeight
    });

    // Compose the final image onto a new canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outWidth;
    outCanvas.height = outHeight;
    const ctx = outCanvas.getContext('2d');

    // Draw the photo then the frame on top
    ctx.drawImage(photoCanvas, 0, 0, outWidth, outHeight);

    if (frameEl.complete && frameEl.naturalWidth) {
      ctx.drawImage(frameEl, 0, 0, outWidth, outHeight);
    }

    // Export as PNG and trigger download
    outCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'framed-photo.png';
      link.click();
      // Cleanup revokes the object URL after download
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, 'image/png');
  });
}); 