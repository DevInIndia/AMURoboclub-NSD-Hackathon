import { useState } from 'react'
import './Header.css' 
import MenuIcon from '@mui/icons-material/Menu';
import StarPurple500Icon from '@mui/icons-material/StarPurple500';
function Header() {
    return (
      <>
        <div className="title">
            <h1><StarPurple500Icon /></h1>
            <h1>
              Celestial Chatbot
            </h1>
            <div className="header_components">
                <div className="link-container"><a href='#'>Features</a></div>
                <div className="link-container"><a href='#'>Stargazing</a></div>
                <div className="link-container"><a href='#'>About</a></div>
            </div>
            <button className="burger"><MenuIcon/></button>
        
        
        </div>
      </>
    )
}

export default Header;