import React from 'react';

/**
 * Utility function to format text by replacing HTML entities and symbols with proper formatting
 * @param text - The text to format
 * @returns Formatted text with HTML entities replaced
 */
export const formatReviewText = (text: string): string => {
    if (!text) return '';
    
    return text
        // Replace HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&nbsp;/g, ' ')
        .replace(/&copy;/g, '©')
        .replace(/&reg;/g, '®')
        .replace(/&trade;/g, '™')
        .replace(/&hellip;/g, '…')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&lsquo;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&bull;/g, '•')
        .replace(/&middot;/g, '·')
        .replace(/&deg;/g, '°')
        // Replace common HTML line breaks and formatting
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<div>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        // Replace HTML tabs and spaces
        .replace(/&tab;/g, '\t')
        .replace(/&emsp;/g, '    ') // 4 spaces for em space
        .replace(/&ensp;/g, '  ')   // 2 spaces for en space
        // Clean up multiple consecutive newlines
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        // Trim leading and trailing whitespace
        .trim();
};

/**
 * Component to render formatted review text with proper line breaks
 * @param text - The text to format and render
 * @param className - Optional CSS classes
 * @returns JSX element with formatted text
 */
export const FormattedReviewText = ({ 
    text, 
    className = "text-gray-800" 
}: { 
    text: string; 
    className?: string; 
}) => {
    const formattedText = formatReviewText(text);
    
    return (
        <div className={className}>
            {formattedText.split('\n').map((line, index) => (
                <p key={index} className={index > 0 ? 'mt-2' : ''}>
                    {line}
                </p>
            ))}
        </div>
    );
};