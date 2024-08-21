import { useState } from 'react';
import BiotechIcon from '@mui/icons-material/Biotech';
import './Body.css';

function Body() {
  const [isOutputVisible, setIsOutputVisible] = useState(false);

  const handleClick = (e) => {
    e.preventDefault(); 
    setIsOutputVisible(true); 
  };

  return (
    <>
      <main>
        <div className="input_section">         
          <form className='Inputfield'>
            <input 
              type='text' 
              placeholder='e.g. when is the next meteor shower?' 
              className='textInput' 
            />
            <button className='startConversation' onClick={handleClick}>
              <BiotechIcon />
              Start Conversation
            </button>
          </form>
          <div 
            className="output" 
            style={{ display: isOutputVisible ? 'block' : 'none' }}
          >
            This is the output that was hidden.
          </div>
        </div>
        <a href='#' className="advancedsearch">
          <div className='advancedsearchtext'>Advanced Search</div>
        </a>
      </main>
    </>
  );
}

export default Body;
