import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownBlockProps {
  content: string
}

const MarkdownBlock: React.FC<MarkdownBlockProps> = ({ content }) => {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        pre: ({ children }) => (
          <pre className="p-3 bg-gray-800/60 border border-gray-700 rounded overflow-y-auto max-h-[70vh]">{children}</pre>
        ),
        code: ({ children }) => (
          <code className="text-gray-200">{children}</code>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">{children}</a>
        ),
        table: ({ children }) => (
          <table className="w-full border-collapse border border-gray-700">{children}</table>
        ),
        th: ({ children }) => (
          <th className="border border-gray-700 px-2 py-1 bg-gray-800">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-700 px-2 py-1">{children}</td>
        ),
      }}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownBlock