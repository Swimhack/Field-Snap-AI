# Field Snap AI - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
bun install
```

### 2. Set Up Environment Variables
```bash
cp infra/env.example .env
# Edit .env with your API keys (optional for basic functionality)
```

### 3. Run the Application
```bash
bun run dev
```

### 4. Open the Web App
Navigate to: http://localhost:3001

## 📱 How to Use Field Snap AI

### In the Field:
1. **Open the web app** on your mobile device
2. **Take a Photo** or **Upload an Image** of a business advertisement:
   - Truck wraps
   - Store signs
   - Business cards
   - Flyers or posters

### The App Will:
1. **Extract Text** from the image using OCR
2. **Identify Business Information**:
   - Business name
   - Phone number
   - Email address
   - Website URL
   - Physical address
   - Services offered

3. **Search the Web** for missing information:
   - Automatically searches for missing contact details
   - Generates likely website/email if not found
   - Finds social media profiles
   - Retrieves business hours and reviews

4. **Store Lead Data** in local storage:
   - All leads are saved as JSON in browser local storage
   - Data persists across sessions
   - Export functionality for all leads

## 🎯 Key Features

### Camera Capture
- Direct camera access for quick photo capture
- Optimized for mobile devices
- Back camera preferred for better quality

### Image Upload
- Support for existing photos
- Multiple image formats supported
- Drag-and-drop functionality

### Data Extraction
- Advanced OCR with multiple providers
- Smart pattern matching for:
  - Phone numbers (various formats)
  - Email addresses
  - Website URLs
  - Physical addresses

### Web Search Enhancement
- Automatic search for missing information
- Multiple search providers:
  - Google Custom Search
  - Bing Web Search
  - Business directory lookups
  - Social media searches

### Local Storage
- All leads saved locally in browser
- JSON format for easy export/import
- Persistent across browser sessions
- No server-side storage required

### Lead Management
- View all saved leads
- Edit extracted information
- Delete unwanted leads
- Export all leads as JSON

## 📊 Data Structure

Each lead is stored as a JSON object:
```json
{
  "id": "unique-id",
  "businessName": "ABC Plumbing Services",
  "phoneNumber": "(555) 123-4567",
  "email": "info@abcplumbing.com",
  "website": "www.abcplumbing.com",
  "address": "123 Main Street, Anytown, USA",
  "services": ["Plumbing", "Emergency Service", "Drain Cleaning"],
  "socialMedia": {
    "facebook": "https://facebook.com/abcplumbing",
    "instagram": "https://instagram.com/abcplumbing"
  },
  "imageData": "base64-encoded-image",
  "capturedAt": "2025-01-20T10:30:00Z",
  "leadScore": 75,
  "qualificationStatus": "qualified"
}
```

## 🔧 API Configuration (Optional)

For enhanced functionality, configure these APIs in your `.env` file:

### OCR Providers:
- **Google Cloud Vision API**: Best accuracy
- **OpenAI Vision API**: Good fallback option

### Web Search:
- **Bing Search API**: Web search for business info
- **Google Custom Search**: Alternative search provider

### Without API Keys:
The app will still work with:
- Basic text extraction from images
- Manual data entry
- Local storage functionality
- Generated website/email suggestions

## 📱 Mobile Installation

### iOS Safari:
1. Open http://localhost:3001 in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android Chrome:
1. Open http://localhost:3001 in Chrome
2. Tap the menu (3 dots)
3. Select "Add to Home screen"

## 🛠️ Troubleshooting

### Camera Not Working:
- Check browser permissions for camera access
- Ensure HTTPS connection (or localhost)
- Try using file upload instead

### OCR Not Working:
- Check API keys in .env file
- Verify internet connection
- Use manual entry as fallback

### Data Not Persisting:
- Check browser local storage settings
- Ensure not in private/incognito mode
- Export data regularly as backup

## 🚀 Production Deployment

1. Build the application:
```bash
bun run build
```

2. Deploy to your hosting service:
- Netlify
- Vercel
- Railway
- Any static hosting

3. Configure environment variables on your hosting platform

## 📝 License

MIT License - See LICENSE file for details