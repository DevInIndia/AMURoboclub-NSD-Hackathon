import React, { useState } from "react";
import axios from "axios"
import "./Advancesearch.css";

const AdvanceSearch = () => {
  let [temp, setTemp] = useState("");
  let [lumin, setLumin] = useState("");
  let [magni, setMagni] = useState("");
  let [color, setColor] = useState("");
  let [spect, setSpect] = useState("");
  let [radii, setRadii] = useState("");
  let [searchedContent, setSearchedContent] = useState("");

  const changeTemp = (e) => {
    setTemp(e.target.value);
  }

  const changeLumin = (e) => {
    setLumin(e.target.value)
  }

  const changeMagni = (e) => {
    setMagni(e.target.value)
  }

  const changeColor = (e) => {
    setColor(e.target.value)
  }

  const changeSpect = (e) => {
    setSpect(e.target.value)
  }

  const changeRadii = (e) => {
    setRadii(e.target.value);
  }

  const handleClick = () => {
    axios.post("http://localhost:8080/search", { temp, lumin, magni, color, spect, radii })
      .then((res) => {
        setSearchedContent(res.data);
      })
  }

  return (
    <div className="advanceSection">
      <form className="advanceInputfield" action="http://localhost:8080/api/advanced-search" method="POST">
        <div className="input">
          <p>Temperature</p>
          <input type="number" placeholder="Temprature in Kelvin" name="temp" value={temp} onChange={changeTemp} required/>
        </div>
        <div className="input">
          <p>Relative Luminosity</p>
          <input type="number" placeholder="Relative Luminosity" name="lumin" value={lumin} onChange={changeLumin} required/>
        </div>
        <div className="input">
          <p>Abosolute magnitude</p>
          <input type="number" placeholder="Abosolute magnitude" name="magni" value={magni} onChange={changeMagni} required/>
        </div>
        <div className="input">
          <p>Color</p>
          <input type="number" placeholder="Color of the star" name="color" value={color} min={1} max={6} onChange={changeColor} required/>
        </div>
        <div className="input">
          <p>Spectral class of star</p>
          <input type="number" placeholder="Spectral class" name="spect" min={1} max={6} value={spect} onChange={changeSpect} required/>
        </div>
        <div className="input">
          <p>Radius of the Star</p>
          <input type="number" placeholder="Radius of the star" name="radii" value={radii} onChange={changeRadii} required/>
        </div>
        <button onClick={handleClick} className="Enterinfo">Search</button>
      </form>

    </div>
  );
};

export default AdvanceSearch;
