import { useState } from 'react'
import './Header.css' 
import FlareIcon from '@mui/icons-material/Flare';
function Header() {
    return (
      <>
        <div className="title">
            
            <h1 className='botname'>
              <FlareIcon />
              Celestial Chatbot
            </h1>
            <div className="header_components">
                <div className="link-container"><a href='#'>Features</a></div>
                <div className="link-container"><a href='#'>Stargazing</a></div>
                <div className="link-container"><a href='#'>About</a></div>
            </div>
        
        
        </div>
      </>
    )
}

export default Header;