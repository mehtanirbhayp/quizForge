import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Split on $$...$$ (block math) or $...$ (inline math)
  const renderFormattedText = (raw: string) => {
    // Regex matches $$...$$ or $...$
    const parts = raw.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-2" />;
        } catch (e) {
          return <span key={index} className="font-mono text-amber-400">{part}</span>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5" />;
        } catch (e) {
          return <span key={index} className="font-mono text-amber-400">{part}</span>;
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return <div className={`leading-relaxed ${className}`}>{renderFormattedText(text)}</div>;
};
