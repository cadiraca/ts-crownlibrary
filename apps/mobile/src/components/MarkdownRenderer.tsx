import React from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface Props {
  content: string;
}

const markdownStyles = StyleSheet.create({
  body: {
    color: '#e2e2f0',
    fontSize: 15,
    lineHeight: 26,
    fontFamily: undefined,
  },
  heading1: {
    color: '#e2e2f0',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
    paddingBottom: 8,
  },
  heading2: {
    color: '#e2e2f0',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  heading3: {
    color: '#e2e2f0',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    color: '#d0d0e8',
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: '#252535',
    color: '#f0a0c0',
    fontFamily: 'Courier',
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: '#16161f',
    borderRadius: 8,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  code_block: {
    color: '#d0d0e0',
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 20,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#7c5cbf',
    paddingLeft: 12,
    marginVertical: 8,
    opacity: 0.8,
  },
  blockquote_text: {
    color: '#9a9ab8',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 22,
  },
  bullet_list: { marginBottom: 12 },
  ordered_list: { marginBottom: 12 },
  list_item: { color: '#d0d0e8', fontSize: 15, lineHeight: 24, marginBottom: 4 },
  link: { color: '#9b7fd4', textDecorationLine: 'underline' },
  table: { borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 6, marginVertical: 12 },
  thead: { backgroundColor: '#1a1a24' },
  th: { color: '#e2e2f0', fontWeight: '600', padding: 8, borderRightWidth: 1, borderColor: '#2a2a3a', fontSize: 13 },
  td: { color: '#c0c0d8', padding: 8, borderRightWidth: 1, borderColor: '#2a2a3a', fontSize: 13 },
  hr: { backgroundColor: '#2a2a3a', height: 1, marginVertical: 20 },
  strong: { color: '#e2e2f0', fontWeight: '700' },
  em: { fontStyle: 'italic' },
});

export default function MarkdownRenderer({ content }: Props) {
  return (
    <Markdown style={markdownStyles}>
      {content}
    </Markdown>
  );
}
