# 🎵 Music File Access Guide for Power BI Custom Visual

## Problem: Local File Access
Your CSV contains local file paths like:
```
C:\Users\phseamar\OneDrive - Microsoft\Documents\Music\Artist\Track.mp3
```

But Power BI Custom Visuals run in a **web browser context** and cannot directly access local file system paths due to security restrictions.

## 🔧 Solutions (Choose One)

### Solution 1: ✅ **Web Server Approach (Recommended)**
Host your music files on a local web server.

#### Step 1: Create Simple Web Server
Save this as `music-server.py` in your music folder:

```python
import http.server
import socketserver
import os
from urllib.parse import unquote

PORT = 8000
MUSIC_DIRECTORY = r"C:\Users\phseamar\OneDrive - Microsoft\Documents\Music"

class MusicHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=MUSIC_DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Enable CORS for Power BI
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

print(f"🎵 Music Server Starting...")
print(f"📁 Serving: {MUSIC_DIRECTORY}")
print(f"🌐 URL: http://localhost:{PORT}")
print("Press Ctrl+C to stop")

with socketserver.TCPServer(("", PORT), MusicHandler) as httpd:
    httpd.serve_forever()
```

#### Step 2: Update Your CSV
Run this PowerShell script to create web-compatible URLs:

```powershell
# Update music-catalog.csv with web server URLs
$csv = Import-Csv "music-catalog.csv"
$csv | ForEach-Object {
    $relativePath = $_.Relative_Path -replace '\\', '/'
    $_.URL = "http://localhost:8000/$relativePath"
}
$csv | Export-Csv "music-catalog-web.csv" -NoTypeInformation
Write-Host "✅ Created music-catalog-web.csv with web URLs"
```

#### Step 3: Use in Power BI
- Start the Python server: `python music-server.py`
- Import `music-catalog-web.csv` to Power BI
- Use the `URL` column in your Custom Visual

---

### Solution 2: 🔄 **File Input Approach**
Modify the Custom Visual to accept file uploads.

This would require updating the visual code to include file input elements for each track.

---

### Solution 3: 🌐 **Cloud Storage**
Upload your music to OneDrive, Google Drive, or Azure Storage and use public URLs.

---

### Solution 4: ⚡ **Quick Test with Sample URLs**
For immediate testing, create a small CSV with web-accessible music URLs:

```csv
File_Name,File_Path,URL,Title,Artist,Genre,Estimated_BPM
sample1.mp3,,https://www.soundjay.com/misc/sounds/bell-ringing-05.wav,Test Track 1,Test Artist,Electronic,120
sample2.mp3,,https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand3.wav,Test Track 2,Test Artist,Pop,110
```

## 🎛️ Recommended Approach

**For Development/Testing:**
1. Use Solution 1 (Web Server) - Quick setup, works with your existing music
2. Test your DJ Mashup mode and Master BPM controls
3. Verify all features work correctly

**For Production:**
1. Upload music to cloud storage (OneDrive Business, Azure Storage)
2. Update CSV with public URLs
3. Deploy for broader use

## 🔧 Troubleshooting

**If tracks still won't play:**
1. Check browser console for errors (F12)
2. Verify URLs are accessible (try in browser)
3. Check CORS headers are set correctly
4. Ensure file formats are web-compatible (MP3, WAV, OGG)

**CORS Issues:**
Power BI requires proper CORS headers. The Python server above includes them.

**File Format Support:**
- ✅ MP3 (best compatibility)
- ✅ WAV (large files)  
- ✅ OGG (good compression)
- ❌ FLAC (limited browser support)

Would you like me to help implement any of these solutions?