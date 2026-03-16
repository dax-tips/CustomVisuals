# Power BI Music Player - Data Binding Guide

## 🎯 Overview
Your Power BI Custom Visual now supports full data binding! Users can drag fields from their datasets directly into the visual to create dynamic playlists.

## 📊 Data Wells Configuration

### ✅ Available Data Fields:

1. **🎵 Music URLs** (Required)
   - **Type**: Text/String column
   - **Description**: File paths or URLs to audio files
   - **Examples**: 
     - `"file:///C:/Music/song1.mp3"`
     - `"https://cdn.example.com/audio/track.wav"`
     - `"./assets/music/demo.ogg"`

2. **🏷️ Track Names** (Optional)
   - **Type**: Text/String column  
   - **Description**: Display names for tracks
   - **Examples**: `"My Awesome Song"`, `"Dance Track #1"`

3. **📊 Audio Data** (Optional)
   - **Type**: Numeric measures (up to 10)
   - **Description**: Additional data for enhanced visualization
   - **Examples**: BPM, Duration, Popularity Score, etc.

4. **📁 Categories** (Optional)
   - **Type**: Text/String column (up to 5)
   - **Description**: Genre, artist, album groupings
   - **Examples**: `"Rock"`, `"Electronic"`, `"Classical"`

## 🚀 How to Use

### In Power BI Desktop:
1. **Add the visual** to your report canvas
2. **Drag fields** from your dataset to the corresponding wells:
   - Drag music file paths/URLs → **"Music URLs"**
   - Drag song names → **"Track Names"** 
   - Drag categories/genres → **"Categories"**
   - Drag numeric data → **"Audio Data"**

### Example Dataset Structure:
```
| FilePath                    | SongName          | Genre      | BPM | Rating |
|----------------------------|-------------------|------------|-----|--------|
| /music/rock1.mp3           | "Thunder Road"    | Rock       | 120 | 4.5    |
| /music/electronic1.wav     | "Digital Dreams"  | Electronic | 140 | 4.8    |
| /music/classical1.ogg      | "Moonlight"       | Classical  | 60  | 4.9    |
```

## 🎛️ Features

### ✅ What Happens When You Bind Data:
- **Automatic playlist creation** from your dataset
- **Real-time updates** when data changes
- **Smart validation** of audio file URLs
- **Enhanced UI** with track categories and metadata
- **Data-driven visualizations** using numeric measures

### ✅ Fallback Functionality:
- **No data bound**: Visual works with file uploads
- **Partial data**: Missing fields are handled gracefully
- **Invalid URLs**: Bad entries are filtered out with warnings

## 🔧 Technical Details

### Data Validation:
- **URL Format Check**: Validates audio file extensions (.mp3, .wav, .ogg, .m4a, .aac, .flac, .webm)
- **Path Support**: Handles relative paths, HTTP/HTTPS URLs, blob URLs
- **Error Handling**: Invalid entries are skipped with console warnings

### Performance:
- **Optimized processing** for large datasets
- **Incremental updates** when data changes
- **Memory efficient** playlist management

## 🐛 Troubleshooting

### "Can't drag fields to the visual":
- ✅ **Fixed!** Removed `supportsEmptyDataView: true` 
- Data wells should now appear in the Fields pane

### "Tracks not loading":
- Check file paths are accessible
- Verify audio file formats are supported
- Check browser console for validation messages

### "Visual shows empty playlist":
- Ensure URLs point to valid audio files
- Check that Music URLs field has data
- Verify network access to remote files

## 📈 Best Practices

1. **Use absolute file paths** for local files
2. **Test URLs** before adding to dataset
3. **Include track names** for better UX
4. **Add categories** for organization
5. **Use numeric data** for enhanced visualizations

---

**Ready to create dynamic, data-driven music experiences!** 🎵📊