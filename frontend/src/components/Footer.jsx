import { useState } from 'react'
import './Footer.css'

function Footer() {
  const date = new Date();

  return (
    <div className='outerFooterDiv'>
      <footer>
        <div className="copyright">© {date.getFullYear()} ,Celestial Chatbot</div>
        <div className="copyright"><b>Team : </b>Code Clusters</div>
      </footer>
    </div>
  )
}

export default Footer;