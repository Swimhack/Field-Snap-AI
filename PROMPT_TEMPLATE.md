# Image Subject Identification and Text Extraction Prompt Template

## Purpose
This prompt template implements a human-like visual scanning methodology to identify the primary subject of an image (usually a sign or advertisement), extract all text from it, and present the information in a structured format.

## Usage
Use this prompt with any AI vision model (GPT-4 Vision, Claude 3, etc.) to analyze images and extract business information.

## The Prompt Template

```
You are an expert at analyzing images to identify the primary subject that the photographer intended to capture, following human-like visual scanning methodology.

**STEP 1: INITIAL VISUAL SCAN (Human-like Observation)**
Perform an initial visual scan and identify what immediately draws attention:
- What object(s) stand out due to color, contrast, or positioning?
- What appears to be placed deliberately for the viewer to see?
- What has the most visual prominence in the image?

**STEP 2: SUBJECT IDENTIFICATION RULES**
Apply these rules to identify the primary subject:

Rule 1 - TEXT PRESENCE & LEGIBILITY: Objects with clear, readable text are highly likely to be the intended subject, especially informational signs or advertisements.

Rule 2 - CENTRALITY/PROMINENCE: Objects that are centered or take up significant focused area are often the subject.

Rule 3 - CONTRAST: The subject often stands out from background due to color, shape, or lighting.

Rule 4 - CONTEXTUAL RELEVANCE: Objects serving informational purposes (signs, displays) are strong candidates.

**STEP 3: CONCEPTUAL SEGMENTATION**
Once identified, mentally isolate the primary subject:
- Draw a conceptual bounding box around just the main subject
- Exclude supporting structures (poles, stands, frames)
- Exclude background elements (grass, buildings, cars, people)
- Focus only on the informational content area

**STEP 4: TEXT EXTRACTION & DATA STRUCTURING**
From the isolated subject, extract and categorize ALL visible text:
- Business Name
- Services/Description
- Address
- Phone Number
- Website/Email
- Hours of Operation
- Any other displayed information

**STEP 5: SUBJECT DESCRIPTION**
Describe what the subject is (type of sign/display) and what data it's displaying.

Be methodical and thorough in following these steps.

Format your response as JSON following this exact structure:
{
  "step1_initialScan": {
    "firstImpression": "What immediately drew your attention in the image",
    "prominentObjects": ["object1", "object2", "..."],
    "visualHierarchy": "Description of what stands out most"
  },
  "step2_subjectIdentification": {
    "rule1_textPresence": "Assessment of text visibility and legibility",
    "rule2_centrality": "Assessment of object positioning and prominence", 
    "rule3_contrast": "Assessment of how subject stands out from background",
    "rule4_contextualRelevance": "Assessment of informational purpose",
    "primarySubject": "The identified main subject"
  },
  "step3_conceptualSegmentation": {
    "boundingDescription": "Description of the isolated subject area",
    "excludedElements": ["background elements that were filtered out"],
    "isolationSuccess": true/false,
    "focusArea": "Description of the isolated informational content"
  },
  "step4_textExtraction": {
    "allVisibleText": ["line1", "line2", "line3", "..."],
    "structuredData": {
      "businessName": "extracted business name or null",
      "services": ["service1", "service2"] or null,
      "address": "extracted address or null", 
      "phoneNumber": "extracted phone or null",
      "website": "extracted website/email or null",
      "hours": "extracted hours or null",
      "otherInfo": ["any other information"]
    }
  },
  "step5_subjectDescription": {
    "subjectType": "Type of sign/display (business sign, storefront, billboard, etc.)",
    "dataDisplayed": "Summary of what information is being presented",
    "purpose": "What the sign/display is trying to communicate"
  },
  "visualDescription": "Complete description of the entire image",
  "mainSubject": {
    "shape": "rectangular|square|circular|irregular|unknown",
    "colors": ["color1", "color2"],
    "estimatedText": ["text1", "text2"],
    "layout": "horizontal|vertical|mixed|unknown"
  },
  "confidence": 0.0-1.0
}
```

## Example Use Cases

### Example 1: Business Sign Analysis
Input: Photo of a red and white pet grooming sign
Expected Output:
- Identifies the sign as the primary subject
- Extracts: "POSH PET STUDIO", "PET GROOMING", "23219 MORTON RANCH RD.", "346-460-7674"
- Categorizes each piece of information appropriately

### Example 2: Storefront Analysis
Input: Photo of a restaurant storefront
Expected Output:
- Isolates the storefront signage from surrounding buildings/cars
- Extracts business name, hours, menu items, contact info
- Describes the type of establishment

## Implementation Notes

1. **Flexibility**: This template works with any vision-capable AI model
2. **Structured Output**: The JSON format ensures consistent, parseable results
3. **Human-like Logic**: Follows natural visual scanning patterns
4. **Comprehensive**: Captures both visual analysis and text extraction
5. **Scalable**: Can be adapted for different types of signage and displays

## Integration Tips

- Use with vision models that support detailed image analysis
- Parse the JSON response to extract specific business data
- Combine with OCR tools for enhanced text accuracy
- Log the methodology steps for debugging and improvement
