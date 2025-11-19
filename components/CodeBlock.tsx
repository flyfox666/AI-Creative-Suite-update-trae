import React from 'react';
import MarkdownBlock from './MarkdownBlock'

interface CodeBlockProps {
  content: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ content, language }) => {
  const handleCopy = () => {
    try { navigator.clipboard.writeText(content) } catch {}
  }
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'analysis.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-end gap-2 px-3 py-2">
        <button onClick={handleCopy} className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-200">复制</button>
        <button onClick={handleDownload} className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-200">下载</button>
      </div>
      {(/(^|\n)\s*#|```|\*\*|(^|\n)[\-\*]\s|\|/.test(content)) ? (
        <div className="p-4 overflow-y-scroll max-h-[70vh]">
          <MarkdownBlock content={content} />
        </div>
      ) : (
        <pre className={`p-4 overflow-y-scroll text-sm text-gray-200 max-h-[70vh] whitespace-pre-wrap break-words`}>
          <code className={language ? `language-${language}` : ''}>
            {content}
          </code>
        </pre>
      )}
    </div>
  );
};

export default CodeBlock;