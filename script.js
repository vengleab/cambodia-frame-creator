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
  let previewTimeout = null; // debounce handle for preview updates

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

        // Once the image and cropper are ready, remove the placeholder space
        // and shrink the container so that touch gestures outside the image
        // no longer move the frame (particularly important on mobile).
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer && cropper) {
          canvasContainer.style.minHeight = '0';
          const { width, height } = cropper.getContainerData();
          canvasContainer.style.width = `${width}px`;
          canvasContainer.style.height = `${height}px`;
        }

        // Initial preview render
        schedulePreviewUpdate();
      },
      crop() { adjustFrameOverlay(); schedulePreviewUpdate(); },
      zoom() { adjustFrameOverlay(); schedulePreviewUpdate(); }
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

  function schedulePreviewUpdate() {
    // Debounce rapid crop/zoom events to avoid heavy work every tick
    if (previewTimeout) {
      clearTimeout(previewTimeout);
    }
    previewTimeout = setTimeout(updatePreview, 150);
  }

  function updatePreview() {
    if (!cropper) return;
    // Determine preview size based on the left preview image width
    const previewTarget = document.getElementById('framePreview');
    const targetWidth = previewTarget.clientWidth || 300;
    const aspect = frameAspect || 1;
    const targetHeight = Math.round(targetWidth / aspect);

    const photoCanvas = cropper.getCroppedCanvas({
      width: targetWidth,
      height: targetHeight
    });

    // Compose onto an off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(photoCanvas, 0, 0, targetWidth, targetHeight);
    if (frameEl.complete && frameEl.naturalWidth) {
      ctx.drawImage(frameEl, 0, 0, targetWidth, targetHeight);
    }
    previewTarget.src = canvas.toDataURL('image/png');
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

    // Export as PNG then either invoke the Web Share API (iOS / mobile friendly)
    // or fall back to a traditional download via a temporary anchor element.
    outCanvas.toBlob(async (blob) => {
      if (!blob) return;

      const fileName = 'framed-photo.png';

      // Attempt to use the Web Share API with file support (iOS / Android mobile only)
      const isMobile = (() => {
        if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
          return navigator.userAgentData.mobile;
        }
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      })();

      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        // Only invoke share on mobile devices – desktop Safari/Chrome may support share but users typically expect a download instead.
        if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Framed Photo' });
          return; // Sharing succeeded, we're done.
        }
      } catch (err) {
        // Either Web Share not supported / user cancelled / permissions – fall through to download.
      }

      // Fallback: create a temporary <a> element and trigger a download.
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;

      // Safari on iOS requires the element to be in the DOM to trigger the download.
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup: revoke the blob URL after a short delay to ensure the download finished.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  });
}); 