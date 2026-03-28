import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

const BOT_RESPONSES = {
  greet: ['hello', 'hi', 'hey', 'greetings'],
  study: ['study', 'learn', 'learning', 'how to study', 'tips'],
  quiz: ['quiz', 'test', 'exam', 'assessment'],
  assignment: ['assignment', 'homework', 'task', 'submit'],
  attendance: ['attendance', 'absent', 'present', 'mark'],
  math: ['math', 'mathematics', 'calculus', 'algebra', 'statistics'],
  programming: ['programming', 'coding', 'code', 'python', 'javascript', 'java', 'c++'],
  help: ['help', 'support', 'assist', 'what can you do'],
}

const RESPONSES = {
  greet: ["Hello! 👋 I'm your AI Tutor. How can I help you with your studies today?", "Hi there! Ready to learn something new? Ask me anything! 🎓"],
  study: ["Here are some effective study tips:\n1. 📖 Use the Pomodoro technique (25 min study / 5 min break)\n2. 🔁 Review notes within 24 hours\n3. ✍️ Practice active recall\n4. 🧠 Spaced repetition for long-term retention", "Try breaking complex topics into smaller chunks. Use mind maps to connect concepts!"],
  quiz: ["For quiz preparation:\n1. Review all lecture notes\n2. Practice past papers\n3. Focus on weak areas first\n4. Get a good night's sleep before the test! 💤", "Check your course quizzes section to find available quizzes and practice!"],
  assignment: ["For assignments:\n1. Read instructions carefully\n2. Break the task into smaller parts\n3. Start early – don't leave it to the last minute!\n4. Use the submissions page to upload your work 📎", "Need help understanding an assignment? Share the topic and I'll explain the concept!"],
  attendance: ["Your attendance is tracked in the Attendance section. Maintain above 75% to avoid academic issues. If you've been absent, talk to your teacher! ✅"],
  math: ["Math can be tricky! Here's help:\n1. Understand concepts, don't just memorize\n2. Practice problems daily\n3. Khan Academy is great for free math lessons\n4. Ask your teacher for unclear topics 📐"],
  programming: ["Programming tips:\n1. 💻 Code every day – practice makes perfect\n2. Read documentation\n3. Build projects – not just exercises\n4. Use platforms like LeetCode, HackerRank, or Codeforces for practice"],
  help: ["I can help you with:\n📚 Study tips and techniques\n🧮 Subject explanations\n📝 Assignment guidance\n🎯 Exam preparation\n✅ Attendance queries\n💬 General academic advice\n\nJust ask me anything!"],
  default: ["That's a great question! Let me think... 🤔\nI recommend checking your course materials or asking your teacher for specific queries.", "I'm still learning! For detailed subject questions, consult your teacher or textbook. But I'm here for general advice! 😊"],
}

const getResponse = (input) => {
  const lower = input.toLowerCase()
  for (const [key, triggers] of Object.entries(BOT_RESPONSES)) {
    if (triggers.some(t => lower.includes(t))) {
      const resArr = RESPONSES[key]
      return resArr[Math.floor(Math.random() * resArr.length)]
    }
  }
  return RESPONSES.default[Math.floor(Math.random() * RESPONSES.default.length)]
}

export default function StudentChatbot() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Hi ${profile?.name?.split(' ')[0] || 'there'}! 👋 I'm your AI Tutor. Ask me anything about your studies!`, time: new Date() }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input.trim(), time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      const botReply = getResponse(userMsg.text)
      setMessages(prev => [...prev, { role: 'bot', text: botReply, time: new Date() }])
      setTyping(false)
    }, 800 + Math.random() * 600)
  }

  const quickPrompts = ['Study tips', 'Quiz help', 'Assignment deadline', 'Math help', 'Coding tips']

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Header */}
      <div className="card mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-2xl">🤖</div>
        <div>
          <h2 className="text-white font-bold">AI Tutor</h2>
          <p className="text-[#9898b8] text-sm">Powered by Academia AI • Available 24/7</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-xs font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
            {m.role === 'bot' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-base flex-shrink-0 mt-1">🤖</div>
            )}
            <div className={`max-w-sm rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-[#1a1a35] border border-[#2a2a4a] text-white rounded-bl-sm'}`}>
              <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
              <p className="text-xs opacity-50 mt-1 text-right">{m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-base">🤖</div>
            <div className="bg-[#1a1a35] border border-[#2a2a4a] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}></div>
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 flex-wrap mb-3">
        {quickPrompts.map(p => (
          <button key={p} onClick={() => { setInput(p); }} className="bg-[#2a2a4a] text-[#9898b8] hover:text-white hover:bg-purple-600/30 text-xs px-3 py-1.5 rounded-full transition-colors">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          className="input-field flex-1"
          placeholder="Ask your AI Tutor anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="btn-primary" disabled={!input.trim() || typing}>
          ➤
        </button>
      </div>
    </div>
  )
}
