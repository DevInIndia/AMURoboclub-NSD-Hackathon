import { useState } from 'react'
import BiotechIcon from '@mui/icons-material/Biotech';
import './Body.css'
function Body() {
    return (
      <>
        <main>
            <div className="input_section">         
              <form className='Inputfield'>
                <input type='text' placeholder='e.g. when is the next meteor shower?' className='textInput' />
                <button className='startConversation'><BiotechIcon />Start Conversation</button>
              </form>
            </div>
        </main>
      </>
    )
}

export default Body;