import React from 'react'
const date = new Date();
const Footer = () => {
  return (
    <footer className="bg-black/40 backdrop-blur-sm border-t border-purple-500/20 py-6">
        <div className="container mx-auto px-4 text-center space-y-2">
          <div className="text-gray-300">
            © {date.getFullYear()}, Celestial Chatbot
          </div>
          <div className="text-gray-400">
            <strong>Team:</strong> Code Clusters
          </div>
        </div>
      </footer>
  )
}

export default Footer