#!/usr/bin/env python3
"""
Test script for Field Snap AI deployment
"""

import asyncio
from playwright.async_api import async_playwright
import sys
import traceback

async def test_deployment():
    """Test the Field Snap AI deployment using Playwright"""

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        try:
            print("Testing https://fieldsnap-ai.fly.dev/")

            # Set timeout for page load
            page.set_default_timeout(30000)  # 30 seconds

            # Try to navigate to the main page
            print("Navigating to main page...")
            response = await page.goto("https://fieldsnap-ai.fly.dev/", wait_until="load")

            print(f"Response status: {response.status}")
            print(f"Response headers: {response.headers}")

            # Take screenshot
            await page.screenshot(path="deployment_main_page.png", full_page=True)
            print("Screenshot saved: deployment_main_page.png")

            # Get page content
            content = await page.content()
            print(f"Page title: {await page.title()}")
            print(f"Page URL: {page.url}")
            print(f"Content length: {len(content)} characters")

            # Test API endpoint
            print("\nTesting /api/ingest endpoint...")
            api_response = await page.goto("https://fieldsnap-ai.fly.dev/api/ingest")
            print(f"API Response status: {api_response.status}")

            # Take screenshot of API response
            await page.screenshot(path="deployment_api_page.png", full_page=True)
            print("API screenshot saved: deployment_api_page.png")

            # Get API response content
            api_content = await page.content()
            print(f"API Content: {api_content[:500]}...")  # First 500 chars

        except Exception as e:
            print(f"Error during testing: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            traceback.print_exc()

            # Take screenshot of error state
            try:
                await page.screenshot(path="deployment_error.png", full_page=True)
                print("Error screenshot saved: deployment_error.png")
            except:
                print("Could not capture error screenshot")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_deployment())