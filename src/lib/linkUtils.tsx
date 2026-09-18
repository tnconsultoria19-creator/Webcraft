import React from 'react';

// URL regex matching http, https, or common domain patterns
const URL_REGEX = /(https?:\/\/[^\s<>"]+|(?:www\.)[^\s<>"]+)/gi;

/**
 * Parses plain text containing URLs and renders them as clickable hyperlinks.
 * Preserves newlines and spaces.
 */
export function renderTextWithClickableLinks(
  text: string,
  linkClassName: string = 'text-[#245F6B] font-semibold underline hover:text-[#1E505A] break-all inline-flex items-center gap-0.5'
): React.ReactNode {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          const href = part.startsWith('http') ? part : `https://${part}`;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={linkClassName}
              title={`Open link: ${href}`}
            >
              {part}
              <span className="text-[10px] no-underline">↗</span>
            </a>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
