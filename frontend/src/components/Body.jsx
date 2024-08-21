import { useEffect, useState } from 'react';
import BiotechIcon from '@mui/icons-material/Biotech';
import axios from 'axios';
import './Body.css';

function Body() {
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  const [currVal, setCurrVal] = useState("");
  let [searchedContent, setSearchedContent] = useState("Something like that");

  const userInput = (e) => {
    setCurrVal(e.target.value);
  }

  const handleClick = (e) => {
    e.preventDefault();
    setIsOutputVisible(true);

    // axios.get("http://localhost:8080/search")
    // .then((res) => {
    //   console.log(res.data);
    //   setSearchedContent(res.data);
    // })

    fetch('http://localhost:8080/search', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Response from backend:', data);
      })
      .catch((error) => {
        console.error('Error sending data to backend:', error);
      });
  };

  return (
    <>
      <main>
        <div className="input_section">
          <form className='Inputfield' action="http://localhost:8080/search"> 
            <input type='text' name={currVal} onChange={userInput} value={currVal} placeholder='e.g. when is the next meteor shower?' className='textInput' />
            <button className='startConversation' onClick={handleClick}>
              <BiotechIcon />
              Start Conversation
            </button>
          </form>
          <div className="output" style={{ display: isOutputVisible ? 'block' : 'none' }}>
            {searchedContent || "This is the output that was hidden."}
          </div>
        </div>
        <a href='/advance' className="advancedsearch">
          <div className='advancedsearchtext'>Advanced Search</div>
        </a>
      </main>
    </>
  );
}

export default Body;
