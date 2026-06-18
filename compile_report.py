import markdown
import subprocess
import os
import fitz

def build_pdf():
    md_path = "laporan_final_kompilasi_nutrigrow.md"
    html_path = "laporan_temp.html"
    pdf_temp_path = "laporan_temp.pdf"
    pdf_final_path = "Laporan_Fix.pdf"
    
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found.")
        return

    # Read markdown content
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Split cover page (everything before the first BAB I heading)
    parts = md_text.split("## **BAB I – PENDAHULUAN**")
    if len(parts) < 2:
        print("Error: Could not split cover page and content. Check headings.")
        return
        
    cover_md = parts[0]
    content_md = "## **BAB I – PENDAHULUAN**\n" + parts[1]

    # Convert content markdown to HTML
    html_body = markdown.markdown(content_md, extensions=['tables', 'fenced_code'])

    # Format cover page HTML
    cover_html = """
    <div class="cover-page">
        <div class="cover-title-label">LAPORAN AKHIR PROYEK</div>
        <div class="cover-title">SISTEM MONITORING DAN OTOMASI IRIGASI CERDAS PADA PERTANIAN BERBASIS IOT MENGGUNAKAN FUZZY LOGIC DENGAN WEB DASHBOARD</div>
        <img class="cover-logo" src="pnj_logo.png" alt="Logo PNJ">
        <div class="cover-authors-label">Disusun oleh:</div>
        <div class="cover-authors">
            1. Muhammad Pandya Hanif Ramadhan (NIM 1)<br>
            2. Muhammad Athaillah Hardianto (NIM 2)<br>
            3. Muhammad Ali Diepo (NIM 3)<br>
            4. Maulana Daviq Putra (NIM 2307422024)<br>
            5. Ravila Sasla Arandika (NIM 5)
        </div>
        <div class="cover-institution">
            PROGRAM STUDI TEKNIK MULTIMEDIA DAN JARINGAN<br>
            JURUSAN TEKNIK INFORMATIKA DAN KOMPUTER<br>
            POLITEKNIK NEGERI JAKARTA<br>
            2026
        </div>
    </div>
    """

    # Post-process html_body to style image captions and center elements
    # Wrap image paragraphs in container class
    # The markdown outputs images like <p><img src="..." ...></p>
    # And captions like <p><em>Gambar ...</em></p>
    import re
    html_body = re.sub(
        r'<p>(<img [^>]+>)</p>',
        r'<p class="image-container">\1</p>',
        html_body
    )
    html_body = re.sub(
        r'<p><em>(Gambar [^<]+)</em></p>',
        r'<p class="caption-container"><em>\1</em></p>',
        html_body
    )
    
    # Wrap in full HTML document
    full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Laporan Akhir Proyek NutriGrow</title>
<style>
@page {{
    size: A4;
    margin-top: 3cm;
    margin-bottom: 3cm;
    margin-left: 3cm;
    margin-right: 3cm;
}}
body {{
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    text-align: justify;
    color: #000;
    margin: 0;
    padding: 0;
}}

/* Cover Page styling */
.cover-page {{
    page-break-after: always;
    text-align: center;
    box-sizing: border-box;
    padding-top: 0.5cm;
    padding-bottom: 0.5cm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 23cm; /* Fit within A4 margins */
}}
.cover-title-label {{
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 1cm;
    text-transform: uppercase;
}}
.cover-title {{
    font-size: 15pt;
    font-weight: bold;
    margin-bottom: 1.5cm;
    text-transform: uppercase;
    line-height: 1.4;
}}
.cover-logo {{
    display: block;
    margin: 1.5cm auto;
    width: 4.5cm;
    height: auto;
}}
.cover-authors-label {{
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 0.3cm;
}}
.cover-authors {{
    font-size: 12pt;
    margin-bottom: 2cm;
    line-height: 1.4;
}}
.cover-institution {{
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    line-height: 1.4;
    margin-top: auto;
}}

/* Report body styling */
.report-content {{
}}

h2 {{
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 0;
    margin-bottom: 1.5em;
    page-break-before: always;
    line-height: 1.5;
}}

/* Remove page break before first heading */
.report-content > h2:first-of-type {{
    page-break-before: avoid;
}}

h3 {{
    font-size: 12pt;
    font-weight: bold;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
    text-align: left;
}}

h4 {{
    font-size: 12pt;
    font-weight: bold;
    margin-top: 1.2em;
    margin-bottom: 0.4em;
    page-break-after: avoid;
    text-align: left;
}}

h5 {{
    font-size: 11pt;
    font-weight: bold;
    margin-top: 1.5em;
    margin-bottom: 0.3em;
    page-break-after: avoid;
    text-align: left;
}}

p {{
    margin-top: 0;
    margin-bottom: 1.5em;
    text-indent: 1.25cm;
    text-align: justify;
}}

/* Clear indents for non-paragraphs */
pre, table, ul, ol, blockquote, p.image-container, p.caption-container {{
    text-indent: 0;
}}

/* Code blocks */
pre {{
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    padding: 8pt;
    font-family: Consolas, Monaco, "Courier New", monospace;
    font-size: 9.5pt;
    line-height: 1.2;
    white-space: pre-wrap;
    word-break: break-all;
    margin-bottom: 1.5em;
    page-break-inside: avoid;
}}

/* Tables */
table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5em;
    font-size: 10.5pt;
    line-height: 1.3;
    page-break-inside: auto;
}}
tr {{
    page-break-inside: avoid;
    page-break-after: auto;
}}
th, td {{
    border: 1px solid #000;
    padding: 5pt 7pt;
    text-align: justify;
    vertical-align: top;
}}
th {{
    background-color: #f2f2f2;
    font-weight: bold;
    text-align: center;
}}

/* Alignments inside table */
td:first-child {{
    text-align: center;
}}
td.center, th.center {{
    text-align: center;
}}

/* Images */
p.image-container {{
    text-align: center;
    margin-bottom: 0.5em;
}}
img {{
    display: inline-block;
    max-width: 90%;
    max-height: 8.5cm;
    height: auto;
    page-break-inside: avoid;
}}

/* Captions and list styles */
em {{
    font-style: italic;
}}
strong {{
    font-weight: bold;
}}

p.caption-container {{
    display: block;
    text-align: center;
    font-size: 11pt;
    margin-top: 0.3em;
    margin-bottom: 1.5em;
    font-style: italic;
}}

ul, ol {{
    margin-top: 0;
    margin-bottom: 1.5em;
    padding-left: 2em;
}}

li {{
    margin-bottom: 0.3em;
    text-align: justify;
}}

/* Page breaks */
.page-break {{
    page-break-before: always;
}}

</style>
</head>
<body>
{cover_html}
<div class="report-content">
{html_body}
</div>
</body>
</html>
"""

    # Save html temp file
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(full_html)
    print("HTML file generated.")

    # Compile HTML to PDF using headless Chrome
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    html_abs_path = os.path.abspath(html_path)
    pdf_temp_abs_path = os.path.abspath(pdf_temp_path)
    
    chrome_cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_temp_abs_path}",
        html_abs_path
    ]
    
    print("Running Chrome to generate PDF...")
    try:
        result = subprocess.run(chrome_cmd, capture_output=True, text=True, check=True)
        print("Chrome stdout:", result.stdout)
        print("Chrome stderr:", result.stderr)
        print("Exists:", os.path.exists(pdf_temp_path))
        print("Temporary PDF compiled successfully.")
    except Exception as e:
        print("Error compiling PDF via Chrome:", e)
        if hasattr(e, 'stdout') and e.stdout:
            print("Stdout:", e.stdout)
        if hasattr(e, 'stderr') and e.stderr:
            print("Stderr:", e.stderr)
        return

    # Post-process compiled PDF using PyMuPDF (fitz) to add custom running header and page numbers
    print("Post-processing PDF...")
    try:
        doc = fitz.open(pdf_temp_path)
        total_pages = len(doc)
        print(f"Adding headers/footers to {total_pages} pages...")
        
        for page in doc:
            # Skip page 1 (cover page)
            if page.number == 0:
                continue
                
            # Draw header line matches 3cm left/right margin on A4
            # A4 width = 595.3 pt. 3cm left = 85.0 pt, 3cm right = 85.0 pt (so x is from 85.0 to 510.3)
            left_x = 85.0
            right_x = 510.3
            
            page.draw_line(
                fitz.Point(left_x, 32), 
                fitz.Point(right_x, 32), 
                color=(0.75, 0.75, 0.75), 
                width=0.5, 
                overlay=True
            )
            
            # Draw running header text right-aligned at y=25
            header_text = "Laporan Akhir Proyek NutriGrow"
            header_width = fitz.get_text_length(header_text, fontname="times-roman", fontsize=8.5)
            page.insert_text(
                fitz.Point(right_x - header_width, 25),
                header_text,
                fontname="times-roman",
                fontsize=8.5,
                color=(0.3, 0.3, 0.3)
            )
            
            # Draw footer page number centered at y=815
            footer_text = f"{page.number + 1}"
            footer_width = fitz.get_text_length(footer_text, fontname="times-roman", fontsize=10)
            page.insert_text(
                fitz.Point((595.3 - footer_width) / 2, 815),
                footer_text,
                fontname="times-roman",
                fontsize=10,
                color=(0.3, 0.3, 0.3)
            )
            
        doc.save(pdf_final_path)
        doc.close()
        print(f"Successfully post-processed and saved to {pdf_final_path}!")
        
        # Clean up temp files
        if os.path.exists(html_path):
            os.remove(html_path)
        if os.path.exists(pdf_temp_path):
            os.remove(pdf_temp_path)
        print("Cleaned up temporary files.")
        
    except Exception as e:
        print("Error during PDF post-processing:", e)

if __name__ == "__main__":
    build_pdf()
