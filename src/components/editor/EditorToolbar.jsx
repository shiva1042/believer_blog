import { useState } from 'react'
import './EditorToolbar.css'

export default function EditorToolbar({ editor, onOpenEmoji, onOpenIcon, onOpenMermaid, onOpenImage }) {
  if (!editor) return null

  const btn = (label, action, isActive, title) => (
    <button
      key={title}
      className={`tb-btn ${isActive ? 'active' : ''}`}
      onClick={action}
      title={title}
      type="button"
    >
      {label}
    </button>
  )

  return (
    <div className="editor-toolbar">
      <div className="tb-group">
        {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold')}
        {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic')}
        {btn('U', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline')}
        {btn('S', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Strikethrough')}
        {btn(<span style={{ background: '#fef08a', padding: '0 4px', borderRadius: 2 }}>H</span>, () => editor.chain().focus().toggleHighlight().run(), editor.isActive('highlight'), 'Highlight')}
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        <select
          className="tb-select"
          value={
            editor.isActive('heading', { level: 1 }) ? '1' :
            editor.isActive('heading', { level: 2 }) ? '2' :
            editor.isActive('heading', { level: 3 }) ? '3' :
            editor.isActive('heading', { level: 4 }) ? '4' : '0'
          }
          onChange={(e) => {
            const level = parseInt(e.target.value)
            if (level === 0) {
              editor.chain().focus().setParagraph().run()
            } else {
              editor.chain().focus().toggleHeading({ level }).run()
            }
          }}
        >
          <option value="0">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
        </select>
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        {btn('⎅', () => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), 'Align Left')}
        {btn('⎆', () => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), 'Align Center')}
        {btn('⎇', () => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), 'Align Right')}
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        {btn('• List', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet List')}
        {btn('1. List', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered List')}
        {btn('❝ Quote', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Blockquote')}
        {btn('< >', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'), 'Code Block')}
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        {btn('🔗', () => {
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }, editor.isActive('link'), 'Insert Link')}
        {btn('🖼️', onOpenImage, false, 'Insert Image')}
        {btn('📊', onOpenMermaid, false, 'Insert Diagram')}
        {btn('😊', onOpenEmoji, false, 'Insert Emoji')}
        {btn('⬡', onOpenIcon, false, 'Insert Icon')}
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        <input
          type="color"
          className="tb-color"
          title="Text Color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          defaultValue="#374151"
        />
        {btn('—', () => editor.chain().focus().setHorizontalRule().run(), false, 'Horizontal Rule')}
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        {btn('↶', () => editor.chain().focus().undo().run(), false, 'Undo')}
        {btn('↷', () => editor.chain().focus().redo().run(), false, 'Redo')}
      </div>
    </div>
  )
}
