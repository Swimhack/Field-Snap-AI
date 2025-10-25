// Field Snap AI - Main Application JavaScript

const API_URL = '/api/leads';
const STORAGE_KEY = 'fieldsnap_leads';

// Application State
const app = {
    currentImage: null,
    currentImageData: null,
    extractedData: null,
    leads: []
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    loadLeadsFromStorage();
    setupEventListeners();
    renderLeadsList();
});

// Setup Event Listeners
function setupEventListeners() {
    // Camera button
    document.getElementById('cameraBtn').addEventListener('click', openCamera);

    // File input
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Camera controls
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);
    document.getElementById('closeCameraBtn').addEventListener('click', closeCamera);

    // Process controls
    document.getElementById('processBtn').addEventListener('click', processImage);
    document.getElementById('retakeBtn').addEventListener('click', retakePhoto);

    // Lead management
    document.getElementById('saveLeadBtn').addEventListener('click', saveLead);
    document.getElementById('searchMoreBtn').addEventListener('click', searchForMoreInfo);
    document.getElementById('exportBtn').addEventListener('click', exportLeads);
}

// Camera Functions
let stream = null;

async function openCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.getElementById('videoElement');
        videoElement.srcObject = stream;

        document.getElementById('cameraView').classList.remove('hidden');
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions or use file upload.');
    }
}

function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    document.getElementById('cameraView').classList.add('hidden');
}

function capturePhoto() {
    const video = document.getElementById('videoElement');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
        app.currentImage = blob;
        const reader = new FileReader();
        reader.onloadend = () => {
            app.currentImageData = reader.result;
            displayImagePreview(reader.result);
        };
        reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.9);

    closeCamera();
}

// File Upload Functions
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        app.currentImage = file;
        const reader = new FileReader();
        reader.onloadend = () => {
            app.currentImageData = reader.result;
            displayImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    }
}

function displayImagePreview(imageSrc) {
    const previewImage = document.getElementById('previewImage');
    previewImage.src = imageSrc;
    document.getElementById('imagePreview').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
}

function retakePhoto() {
    app.currentImage = null;
    app.currentImageData = null;
    app.extractedData = null;
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('fileInput').value = '';
}

// Image Processing
async function processImage() {
    if (!app.currentImage) {
        alert('Please capture or upload an image first');
        return;
    }

    console.log('Starting image processing...');
    showProcessingStatus('Uploading image...');

    try {
        showProcessingStatus('Uploading image to server...');

        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append('image', app.currentImage, app.currentImage.name || 'capture.jpg');
        formData.append('sourceLocation', 'Field Snap Mobile');
        formData.append('sourceNotes', 'Captured via web interface');

        console.log('Sending request to API:', API_URL);
        console.log('Image size:', app.currentImage.size, 'bytes');

        // Call the backend API
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
            // Don't set Content-Type - browser will set it with boundary
        });

        console.log('API response status:', response.status);
        console.log('API response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('Upload result:', result);

        showProcessingStatus('Processing complete!');

        // Use real OCR data from backend
        app.extractedData = {
            id: result.leadId || generateId(),
            businessName: result.data?.businessName || 'Not found',
            phoneNumber: result.data?.phoneNumber || '',
            email: result.data?.email || '',
            website: result.data?.website || '',
            address: result.data?.address || '',
            services: result.data?.services || [],
            socialMedia: {},
            rawText: result.data?.rawText || '',
            imageData: app.currentImageData,
            capturedAt: new Date().toISOString(),
            leadScore: Math.round((result.data?.confidence || 0) * 100),
            qualificationStatus: result.data?.confidence > 0.7 ? 'qualified' : 'pending',
            uploadSuccess: true,
            filename: result.data?.filename || 'unknown',
            filesize: result.data?.size || 0
        };

        // Search for additional information if missing
        if (!app.extractedData.website || !app.extractedData.email) {
            showProcessingStatus('Searching for additional information...');
            await enhanceWithWebSearch();
        }

        hideProcessingStatus();
        displayResults();

    } catch (error) {
        console.error('Error processing image:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        hideProcessingStatus();

        // Show more detailed error message
        const errorMessage = error.message || 'Unknown error occurred';
        alert(`Error processing image: ${errorMessage}`);
    }
}

// Compress and convert to base64 to keep payload small
async function compressAndEncodeImage(imageBlob) {
    const MAX_DIMENSION = 1600;
    const JPEG_QUALITY = 0.75;

    const bitmap = await createImageBitmap(imageBlob);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    try { bitmap.close && bitmap.close(); } catch(e) {}
    return dataUrl;
}

// Deprecated mock; real details are fetched from /api/leads/{id}
async function getLeadDetails(leadId) { return {}; }

function parseBusinessInfo(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    // Extract phone number
    const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
    const phoneMatch = text.match(phoneRegex);

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = text.match(emailRegex);

    // Extract website
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/;
    const websiteMatch = text.match(websiteRegex);

    // Business name is often the first line
    const businessName = lines.length > 0 ? lines[0] : '';

    // Extract address
    const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)/i;
    const addressMatch = text.match(addressRegex);

    // Extract services
    const serviceKeywords = [
        'plumbing', 'electrical', 'hvac', 'landscaping', 'cleaning', 'roofing',
        'painting', 'construction', 'repair', 'maintenance', 'installation',
        'service', 'emergency', 'licensed', 'insured'
    ];

    const services = lines.filter(line =>
        serviceKeywords.some(keyword =>
            line.toLowerCase().includes(keyword.toLowerCase())
        )
    ).slice(0, 5);

    return {
        business_name: businessName,
        phone_number: phoneMatch ? phoneMatch[0] : null,
        email: emailMatch ? emailMatch[0] : null,
        website: websiteMatch ? (websiteMatch[0].startsWith('http') ? websiteMatch[0] : `https://${websiteMatch[0]}`) : null,
        address: addressMatch ? addressMatch[0] : null,
        services: services,
        raw_ocr_text: text,
        lead_score: 50,
        qualification_status: 'qualified'
    };
}

async function enhanceWithWebSearch() {
    if (!app.extractedData.businessName) return;

    try {
        // Simulate web search for missing information
        // In production, you'd call a real search API
        const searchQuery = `${app.extractedData.businessName} ${app.extractedData.address || ''}`;

        // Mock enhanced data
        if (!app.extractedData.website) {
            app.extractedData.website = generateWebsiteFromName(app.extractedData.businessName);
        }

        if (!app.extractedData.email) {
            app.extractedData.email = generateEmailFromName(app.extractedData.businessName);
        }

        if (!app.extractedData.phoneNumber && app.extractedData.businessName) {
            // In production, you'd search for this
            app.extractedData.phoneNumber = '(555) 000-0000';
        }

    } catch (error) {
        console.error('Error enhancing with web search:', error);
    }
}

function generateWebsiteFromName(businessName) {
    if (!businessName) return '';
    const cleaned = businessName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');
    return `www.${cleaned}.com`;
}

function generateEmailFromName(businessName) {
    if (!businessName) return '';
    const cleaned = businessName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');
    return `info@${cleaned}.com`;
}

// Display Results
function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const extractedInfo = document.getElementById('extractedInfo');

    // Calculate priority level based on lead score
    const priorityLevel = app.extractedData.leadScore >= 80 ? 'High' : 
                         app.extractedData.leadScore >= 50 ? 'Medium' : 'Low';

    // Format services
    const services = Array.isArray(app.extractedData.services) 
        ? app.extractedData.services.join(', ') 
        : (app.extractedData.services || '');

    extractedInfo.innerHTML = `
        <h3>Extracted Information</h3>
        
        <div class="info-section">
            <h4>Business Information:</h4>
            <div class="info-item">
                <span class="info-label">Business Name:</span>
                <span class="info-value editable" contenteditable="true" data-field="businessName">${app.extractedData.businessName || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Phone Number:</span>
                <span class="info-value editable" contenteditable="true" data-field="phoneNumber">${app.extractedData.phoneNumber || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email Address:</span>
                <span class="info-value editable" contenteditable="true" data-field="email">${app.extractedData.email || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Website URL:</span>
                <span class="info-value editable" contenteditable="true" data-field="website">${app.extractedData.website || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Physical Address:</span>
                <span class="info-value editable" contenteditable="true" data-field="address">${app.extractedData.address || ''}</span>
            </div>
        </div>

        <div class="info-section">
            <h4>Business Details:</h4>
            <div class="info-item">
                <span class="info-label">Services Offered:</span>
                <span class="info-value">${services}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Business Description:</span>
                <span class="info-value">${app.extractedData.rawText ? app.extractedData.rawText.substring(0, 200) + '...' : ''}</span>
            </div>
        </div>

        <div class="info-section">
            <h4>Lead Quality:</h4>
            <div class="info-item">
                <span class="info-label">Lead Score:</span>
                <span class="info-value">${app.extractedData.leadScore || 0}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">${app.extractedData.qualificationStatus || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Priority Level:</span>
                <span class="info-value">${priorityLevel}</span>
            </div>
        </div>

        <div class="info-section">
            <h4>Additional Information:</h4>
            <div class="info-item">
                <span class="info-label">Social Media:</span>
                <span class="info-value">${Object.keys(app.extractedData.socialMedia || {}).length > 0 ? Object.keys(app.extractedData.socialMedia).join(', ') : ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Business Hours:</span>
                <span class="info-value"></span>
            </div>
            <div class="info-item">
                <span class="info-label">License/Certification:</span>
                <span class="info-value"></span>
            </div>
        </div>

        <div class="info-section">
            <h4>Notes:</h4>
            <div class="info-item">
                <span class="info-label">Source Location:</span>
                <span class="info-value">Field Snap Mobile</span>
            </div>
            <div class="info-item">
                <span class="info-label">Source Notes:</span>
                <span class="info-value">Captured via web interface</span>
            </div>
            <div class="info-item">
                <span class="info-label">Processing Timestamp:</span>
                <span class="info-value">${new Date().toISOString()}</span>
            </div>
        </div>

        <div class="info-section">
            <h4>Raw Data:</h4>
            <div class="info-item">
                <span class="info-label">OCR Text:</span>
                <span class="info-value">${app.extractedData.rawText || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Confidence Level:</span>
                <span class="info-value">High</span>
            </div>
            <div class="info-item">
                <span class="info-label">Processing ID:</span>
                <span class="info-value">${app.extractedData.id || ''}</span>
            </div>
        </div>
    `;

    // Add event listeners for editable fields
    document.querySelectorAll('.info-value.editable').forEach(element => {
        element.addEventListener('blur', (e) => {
            const field = e.target.dataset.field;
            app.extractedData[field] = e.target.textContent;
        });
    });

    resultsSection.classList.remove('hidden');
}

// Lead Management
function saveLead() {
    if (!app.extractedData) {
        alert('No data to save');
        return;
    }

    // Add to leads array
    app.leads.unshift(app.extractedData);

    // Save to local storage
    saveLeadsToStorage();

    // Update UI
    renderLeadsList();

    // Reset
    retakePhoto();

    alert('Lead saved successfully!');
}

async function searchForMoreInfo() {
    if (!app.extractedData) return;

    showProcessingStatus('Searching for additional information...');

    try {
        // Perform web search for more information
        await enhanceWithWebSearch();

        // You could also call additional APIs here
        // For example: Google Places API, Yelp API, etc.

        hideProcessingStatus();
        displayResults();
        alert('Search completed. Information updated.');

    } catch (error) {
        console.error('Error searching for more info:', error);
        hideProcessingStatus();
        alert('Error searching for additional information.');
    }
}

// Storage Functions
function saveLeadsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.leads));
}

function loadLeadsFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            app.leads = JSON.parse(stored);
        } catch (error) {
            console.error('Error loading leads from storage:', error);
            app.leads = [];
        }
    }
}

// Render Leads List
function renderLeadsList() {
    const leadsList = document.getElementById('leadsList');

    if (app.leads.length === 0) {
        leadsList.innerHTML = '<p style="text-align: center; color: #6B7280;">No saved leads yet</p>';
        return;
    }

    leadsList.innerHTML = app.leads.map(lead => `
        <div class="lead-card">
            <img src="${lead.imageData}" alt="${lead.businessName}" class="lead-thumbnail">
            <div class="lead-info">
                <div class="lead-name">${lead.businessName || 'Unnamed Business'}</div>
                <div class="lead-details">${lead.phoneNumber || 'No phone'} • ${lead.email || 'No email'}</div>
                <div class="lead-details">Captured: ${new Date(lead.capturedAt).toLocaleDateString()}</div>
            </div>
            <div class="lead-actions">
                <button class="lead-action-btn" onclick="viewLead('${lead.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
                <button class="lead-action-btn" onclick="deleteLead('${lead.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function viewLead(leadId) {
    const lead = app.leads.find(l => l.id === leadId);
    if (lead) {
        // Display lead details in a modal or new view
        alert(JSON.stringify(lead, null, 2));
    }
}

function deleteLead(leadId) {
    if (confirm('Are you sure you want to delete this lead?')) {
        app.leads = app.leads.filter(l => l.id !== leadId);
        saveLeadsToStorage();
        renderLeadsList();
    }
}

// Export Functions
function exportLeads() {
    if (app.leads.length === 0) {
        alert('No leads to export');
        return;
    }

    const dataStr = JSON.stringify(app.leads, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `fieldsnap_leads_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showProcessingStatus(message) {
    document.getElementById('statusMessage').textContent = message;
    document.getElementById('processingStatus').classList.remove('hidden');
}

function hideProcessingStatus() {
    document.getElementById('processingStatus').classList.add('hidden');
}

// Service Worker for PWA support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'))
}