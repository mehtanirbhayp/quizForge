import fs from 'fs';
import pdfParse from 'pdf-parse';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PDFParseResult {
  numPages: number;
  text: string;
  pages: ExtractedPage[];
  metadata?: any;
}

export async function parsePdfFile(filePath: string): Promise<PDFParseResult> {
  const dataBuffer = fs.readFileSync(filePath);
  
  const pages: ExtractedPage[] = [];
  let currentPage = 1;

  // Custom page renderer to track per-page content
  const pagerender = (pageData: any) => {
    return pageData.getTextContent().then((textContent: any) => {
      let lastY: number | null = null;
      let text = '';
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || lastY === null) {
          text += (text.length > 0 && !text.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      pages.push({
        pageNumber: currentPage++,
        text: text.trim()
      });
      return text;
    });
  };

  const data = await pdfParse(dataBuffer, {
    pagerender: pagerender
  });

  return {
    numPages: data.numpages,
    text: data.text,
    pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: data.text }],
    metadata: data.info
  };
}
