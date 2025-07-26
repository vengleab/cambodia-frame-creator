# Photo Frame Creator

This simple static site lets you:

1. Upload a photo.
2. Crop, zoom, and reposition the photo inside a decorative PNG frame.
3. Download the final composite image as a PNG.

## Getting Started

No build step is necessary. Just open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge).

## Custom Frame

Replace `assets/frame.png` with your own transparent PNG frame. The app automatically detects its aspect ratio and resolution.

*Tip: Ensure the frame PNG has a transparent window where the photo should show through.*

## Dependencies

The only runtime dependency is [Cropper.js](https://github.com/fengyuanchen/cropperjs), included via a CDN link in `index.html`. 