import { useEffect, useState } from 'react';
import BiotechIcon from '@mui/icons-material/Biotech';
import axios from 'axios';
import './Body.css';

function Body() {
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  const [currVal, setCurrVal] = useState("");
<<<<<<< HEAD
  let [searchedContent, setSearchedContent] = useState("Something like that");
  const [inputSectionHeight, setInputSectionHeight] = useState('200px'); // Initial height

  
=======
  let [searchedContent, setSearchedContent] = useState("Please wait, Loading...");
>>>>>>> 9c80b5bf8a3d1b4db4249776421ac2075e4f31d5

  const userInput = (e) => {
    setCurrVal(e.target.value);
  }

  const handleClick = (e) => {
    e.preventDefault();
    setIsOutputVisible(true);
    setInputSectionHeight('400px'); // Change the height to 400px

    axios.post("http://localhost:8080/search", {name: currVal})
    .then((res) => {
      setSearchedContent(res.data);
    })
  };

  return (
    <>
      <main>
<<<<<<< HEAD
        <div className="input_section" style={{ height: inputSectionHeight }}> {/* Apply dynamic height */}
          <form className='Inputfield' action="http://localhost:8080/search"> 
=======
        <div className="input_section">
          <form className='Inputfield' action="http://localhost:8080/search" method="POST"> 
>>>>>>> 9c80b5bf8a3d1b4db4249776421ac2075e4f31d5
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
