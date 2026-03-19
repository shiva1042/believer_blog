import { useState } from 'react'
import './EmojiPicker.css'

const EMOJI_CATEGORIES = {
  'Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','🥸','😎','🤓','🧐'],
  'Gestures': ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏'],
  'Hearts': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💌','💋'],
  'Objects': ['💡','🔥','⭐','🌟','✨','⚡','💥','🎯','🎨','🖊️','✏️','📝','📌','📎','🔗','📁','📂','📊','📈','📉','🗂️','📋','📐','📏','🔧','🔨','⚙️','🔩','🧲','🔬','🔭','💻','🖥️','📱','⌨️','🖱️','💾','💿','📡','🔋','🔌'],
  'Symbols': ['✅','❌','⭕','❗','❓','⚠️','🚫','♻️','✳️','❇️','🔰','💠','Ⓜ️','🔷','🔶','🔵','🟢','🟡','🔴','🟠','🟣','⚪','⚫','🟤','▶️','⏸️','⏹️','⏺️','⏭️','⏮️','🔀','🔁','🔂','▪️','▫️','◾','◽','🔲','🔳'],
  'Nature': ['🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','❄️','🌊','🌸','🌺','🌻','🌹','🌷','🌱','🌿','☘️','🍀','🌳','🌴','🍁','🍂','🍃','🐶','🐱','🐻','🦁','🐸','🦋','🐝','🐞','🦀','🐙','🐬','🐳','🦅','🦆'],
}

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState('Smileys')
  const [search, setSearch] = useState('')
  const categories = Object.keys(EMOJI_CATEGORIES)

  const allEmojis = search
    ? Object.entries(EMOJI_CATEGORIES).flatMap(([cat, emojis]) =>
        cat.toLowerCase().includes(search.toLowerCase()) ? emojis : []
      )
    : EMOJI_CATEGORIES[activeCategory]

  return (
    <div className="emoji-picker-overlay" onClick={onClose}>
      <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
        <div className="emoji-header">
          <span className="emoji-title">Emojis</span>
          <button className="emoji-close" onClick={onClose}>&times;</button>
        </div>
        <input
          type="text"
          className="emoji-search"
          placeholder="Search by category name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="emoji-categories">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`emoji-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => { setActiveCategory(cat); setSearch('') }}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="emoji-grid">
          {allEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              className="emoji-item"
              onClick={() => onSelect(emoji)}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
