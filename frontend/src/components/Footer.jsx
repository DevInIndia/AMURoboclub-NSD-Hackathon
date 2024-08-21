import { useState } from 'react'
import './Footer.css'

function Footer() {
  const date = new Date();

  return (
    <>
      <footer>
        <div className="copyright">© {date.getFullYear()} ,Celestial Chatbot</div>
      </footer>
    </>
  )
}

export default Footer;