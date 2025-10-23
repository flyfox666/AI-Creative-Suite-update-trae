import React from 'react';

interface CodeBlockProps {
  content: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ content, language }) => {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg">
      <pre className="p-4 overflow-y-auto text-sm text-gray-200 max-h-96 whitespace-pre-wrap break-words">
        <code className={language ? `language-${language}` : ''}>
          {content}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;