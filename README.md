# Photo Metadata Studio
A completely private, secure web application designed to automatically write advanced EXIF metadata (Device Model, Lens, Geolocation) and safely batch-rename photos before uploading them to social media or clouds.

## Features
- **Local Processing:** Your photos never leave your device (unless hosted in the cloud explicitly). All parsing, metadata embedding, and saving happens directly.
- **Smart Profiles:** Recreate the metadata footprint of an iPhone 16 Pro Max in New York, or a Google Pixel in Tokyo. Dozens of real devices and famous locations are included.
- **Cloud Accounts (Optional):** Save your custom preset configurations (e.g. "My Studio Setup") using Supabase Authentication.
- **Sequence Generation:** Need to rename 100 photos to mimic the `IMG_XXXX` native format? It automatically calculates times and namespaces.

## Privacy First
When run locally or on a private server, `PhotoMetadataStudio` respects your digital privacy:
1. No telemetry or analytics.
2. Temporary files are destroyed instantly after processing.
3. Your original photos are never overwritten.

## Getting Started
1. `npm install`
2. Configure `.env` with Supabase keys if you want cloud profiles.
3. `npm start`
4. Open `http://localhost:4317`

## License
MIT License. See `LICENSE` for more details.
