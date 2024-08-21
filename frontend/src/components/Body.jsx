import { useEffect, useState } from 'react';
import BiotechIcon from '@mui/icons-material/Biotech';
import axios from 'axios';
import './Body.css';

function Body() {
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  const [currVal, setCurrVal] = useState("");
  let [searchedContent, setSearchedContent] = useState("Please wait, Loading...");

  const userInput = (e) => {
    setCurrVal(e.target.value);
  }

  const handleClick = (e) => {
    e.preventDefault();
    setIsOutputVisible(true);

    axios.post("http://localhost:8080/search", {name: currVal})
    .then((res) => {
      setSearchedContent(res.data);
    })
  };

  return (
    <>
      <main>
        <div className="input_section">
          <form className='Inputfield' action="http://localhost:8080/search" method="POST"> 
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
        <a href='#' className="advancedsearch">
          <div className='advancedsearchtext'>Advanced Search</div>
        </a>
      </main>
    </>
  );
}

export default Body;
