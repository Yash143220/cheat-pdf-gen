# 📄 CheatSheet Printer - Perfect Duplex PDF Imposition

**Print Smart. Save Paper. Zero Page Mismatch.**

A modern web-based PDF imposition tool that converts normal PDFs into print-ready duplex layouts (N-in-1: 9-in-1, 6-in-1, 4-in-1, 2-in-1). Built for students, notes, and exam prep with 100% working duplex logic.

![Made for Students](https://img.shields.io/badge/Made%20For-Students-blue)
![No Backend](https://img.shields.io/badge/Backend-None%20Needed-green)
![100% Free](https://img.shields.io/badge/Price-Free-success)

---

## ✨ Features

### 🎯 Core Features
- **100% Duplex-Safe Layout** - No manual page fixing needed
- **Multiple Layouts** - 9-in-1, 6-in-1, 4-in-1, 2-in-1
- **Perfect Page Alignment** - Page 1 exactly behind page 2, always
- **Auto Blank Handling** - Fills incomplete sheets automatically
- **Client-Side Processing** - No uploads, all processing happens in your browser

### 🎨 UI/UX
- **Modern Design** - Inspired by Notion, Vercel, and Linear
- **Step-by-Step Flow** - Upload → Choose → Customize → Generate
- **Responsive** - Works on desktop, tablet, and mobile
- **Smooth Animations** - Micro-interactions for better UX

### ⚙️ Customization
- **Orientation** - Auto, Portrait, or Landscape
- **Margins & Spacing** - Adjustable page margins and gaps
- **Borders** - None, Light, Normal, or Thick
- **Scale Mode** - Fit or Fill
- **Watermark** - Optional text watermark

---

## 🔄 How Duplex Logic Works

### The Critical Part: Page Arrangement

For **perfect duplex printing**, the application uses this exact logic:

#### Front Side (Odd Pages)
Pages arranged **left-to-right, top-to-bottom**:
```
Example 9-in-1 (3×3 grid):

FRONT SIDE:
┌───┬───┬───┐
│ 1 │ 3 │ 5 │
├───┼───┼───┤
│ 7 │ 9 │11 │
├───┼───┼───┤
│13 │15 │17 │
└───┴───┴───┘
```

#### Back Side (Even Pages)
Same row order, but **each row reversed horizontally**:
```
BACK SIDE (flip on long edge):
┌───┬───┬───┐
│ 6 │ 4 │ 2 │  ← Row 1 reversed
├───┼───┼───┤
│12 │10 │ 8 │  ← Row 2 reversed
├───┼───┼───┤
│18 │16 │14 │  ← Row 3 reversed
└───┴───┴───┘
```

#### Result
When you print this duplex with **"Flip on Long Edge"**, the physical pages align perfectly:
- Page 1 is physically behind Page 2 ✅
- Page 3 is physically behind Page 4 ✅
- Page 5 is physically behind Page 6 ✅
- And so on...

---

## 🖨️ Printing Instructions

### Step-by-Step Printing Guide

1. **Download the Generated PDF**
2. **Open in PDF Reader** (Adobe, Chrome, Preview, etc.)
3. **Click Print**
4. **Configure Settings:**
   - ✅ Enable **"Two-Sided"** or **"Duplex"**
   - ✅ Select **"Flip on Long Edge"**
   - ❌ Do NOT use "Flip on Short Edge"
   - ✅ Set orientation to **Landscape**
5. **Print and Enjoy!**

### Printer Settings Example

```
✅ Correct Settings:
   - Two-Sided: ON
   - Flip: Long Edge
   - Orientation: Landscape

❌ Wrong Settings:
   - Two-Sided: OFF
   - Flip: Short Edge
```

---

## 🚀 Free Hosting Options

Since this is a **100% client-side application** (no backend needed), you can host it for FREE on:

### 1. **Vercel** (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd cheat-maker
vercel
```
- ✅ Free forever
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Custom domain support
- 🌐 [vercel.com](https://vercel.com)

### 2. **Netlify**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd cheat-maker
netlify deploy --prod
```
- ✅ Free tier: 100GB bandwidth
- ✅ Drag-and-drop deploy
- ✅ Form handling
- 🌐 [netlify.com](https://netlify.com)

### 3. **GitHub Pages**
```bash
# Create repo and push
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main

# Enable GitHub Pages in repo settings
```
- ✅ Free for public repos
- ✅ Custom domain support
- 🌐 [pages.github.com](https://pages.github.com)

### 4. **Cloudflare Pages**
```bash
# Deploy via dashboard or CLI
npx wrangler pages publish cheat-maker
```
- ✅ Unlimited bandwidth
- ✅ Super fast CDN
- ✅ Free SSL
- 🌐 [pages.cloudflare.com](https://pages.cloudflare.com)

### 5. **Render**
- Drag and drop your folder
- Free static site hosting
- 🌐 [render.com](https://render.com)

---

## 📁 Project Structure

```
cheat-maker/
│
├── index.html          # Main HTML with UI structure
├── styles.css          # Modern CSS with animations
├── app.js              # PDF processing & imposition logic
└── README.md           # This file
```

### Tech Stack
- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **PDF Reading**: PDF.js (Mozilla)
- **PDF Generation**: pdf-lib
- **No Backend**: Fully client-side
- **No Dependencies**: Just CDN links

---

## 🔧 How to Run Locally

### Option 1: Using Python
```bash
cd cheat-maker
python -m http.server 8000
# Visit http://localhost:8000
```

### Option 2: Using Node.js
```bash
cd cheat-maker
npx serve
# Visit the provided URL
```

### Option 3: Using VS Code
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

---

## 📊 Supported Layouts

| Layout | Grid | Best For |
|--------|------|----------|
| 9-in-1 | 3×3 | Maximum paper savings, small notes |
| 6-in-1 | 3×2 | **Recommended** - Balanced readability |
| 4-in-1 | 2×2 | Large text, presentations |
| 2-in-1 | 2×1 | Slides, maximally readable |

---

## 🎓 Perfect For

- 📚 **Exam Prep** - Print notes in compact format
- 📄 **Study Cheat Sheets** - Fit more content per page
- 🎤 **Presentation Handouts** - Multiple slides per sheet
- 📖 **Book Summaries** - Condense long documents
- 🌳 **Save Paper** - Reduce paper usage by up to 88%

---

## 🐛 Troubleshooting

### Pages Not Aligning
- ✅ Ensure "Flip on Long Edge" is selected
- ✅ Check printer orientation is set to Landscape
- ✅ Try printing a test page first

### Large Files Slow
- PDF processing is done in-browser
- Large PDFs (>50 pages) may take 10-30 seconds
- This is normal and depends on your device speed

### Browser Compatibility
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ❌ IE11 (Not supported)

---

## 📝 Code Explanation

### Key Functions

#### `calculateImpositionLayout(totalPages, layout)`
Calculates which page goes where on front and back of each sheet.

```javascript
// Creates array of sheets, each with:
{
  front: [[1,3,5], [7,9,11], [13,15,17]],  // Odd pages
  back: [[6,4,2], [12,10,8], [18,16,14]]   // Even pages reversed
}
```

#### `renderSide(page, grid, sourcePdf, ...)`
Embeds source pages into output PDF at calculated positions.

#### `generatePDF()`
Main orchestrator:
1. Load source PDF
2. Calculate imposition layout
3. Create blank output PDF
4. Render each sheet (front + back)
5. Save and download

---

## 🤝 Contributing

This is an educational project. Feel free to fork and modify!

### Possible Enhancements
- [ ] Add 16-in-1, 12-in-1 layouts
- [ ] Custom grid dimensions (e.g., 5×2)
- [ ] Page range selection
- [ ] Booklet folding mode
- [ ] Dark mode UI

---

## 📄 License

**MIT License** - Free for personal and commercial use.

---

## 🙋 FAQ

**Q: Does my PDF get uploaded anywhere?**  
A: No! All processing happens in your browser. Zero uploads.

**Q: What if I have an odd number of pages?**  
A: The app automatically adds blank pages to complete sheets.

**Q: Can I print on both sides manually?**  
A: Yes, first print all odd-numbered output pages, then flip and print even pages.

**Q: Why landscape orientation?**  
A: N-in-1 layouts work best on landscape pages for better space usage.

**Q: My printer doesn't support duplex?**  
A: Print odd pages first, flip the stack, then print even pages.

---

## 💡 Pro Tips

1. **Test First** - Print one sheet to verify alignment
2. **Use 6-in-1** - Best balance of readability and savings
3. **Check Preview** - Your PDF reader shows what will print
4. **Thick Paper** - Use slightly thicker paper for duplex printing
5. **Bookmarking** - Add the app to your homescreen for quick access

---

## 🌟 Credits

- **PDF.js** by Mozilla
- **pdf-lib** by Andrew Dillon
- **Design** inspired by Notion, Vercel, and Linear
- **Made with** ☕ for students worldwide

---

**Happy Printing! 🎉**

Made for Students, Notes, and Exam Prep 📚
