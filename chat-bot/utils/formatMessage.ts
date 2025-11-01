import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const formatMessage = (text: string): string => {
  marked.setOptions({ breaks: true });
  let processedText = text;
  const customLatexRegex = /\(([^()]+)\)/g;
  processedText = processedText.replace(customLatexRegex, (match: string, formula: string) => {
    if (formula.includes('\\')) {
      try {
        return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: false });
      } catch (e) {
        return match;
      }
    }
    return match;
  });
  let html = marked.parse(processedText) as string;
  html = html.replace(/(\w+)_(\w+)/g, (match: string, base: string, subscript: string) => {
    if (match.includes('<') || match.includes('>')) {
      return match;
    }
    return `${base}<sub>${subscript}</sub>`;
  });
  html = html.replace(/(\w+)\^(\d+)/g, (match: string, base: string, superscript: string) => {
    if (match.includes('<') || match.includes('>')) {
      return match;
    }
    return `${base}<sup>${superscript}</sup>`;
  });
  html = html.replace(/(\w+)\s*\/\s*(\w+)/g, (match: string, numerator: string, denominator: string) => {
    if (match.includes('<') || match.includes('>')) {
      return match;
    }
    return `${numerator}/<sub>${denominator}</sub>`;
  });
  return html;
};